const http=require('http');
const {TrieRouter}=require('./TrieRouter')
const fs=require('fs');
const {MiddlewareManager}=require("./middleware");
const {Cache}=require('./Cache');
const { pipeline, PassThrough } = require('stream');
const {Loadbalancer}=require('./Loadbalancer');

class httpProxy {
    constructor(options={}){
        this.port= options.port || 8080,
        this.host= options.host || 'localhost',
        this.target=options.target,
        this.client=new httpClient(options.client || {})
        this.client.proxy=this;
        this.middlewareManager=new MiddlewareManager()
        this.router=options.router || new TrieRouter()
        this.loadBalancer=new Loadbalancer()
        this.enableMonitor=options.enableMonitor || false
        this.monitorOptions={
            uiPath:options.monitorOptions?.uiPath || '/__proxy/dashboard',
            wsPath:options.monitorOptions?.wsPath || '/__proxy/ws'
        }
        this.wsClients = new Set();
    }

    async start() {
        return new Promise((resolve,reject)=>{
            this.server=http.createServer(async (req,res)=>{
                await this.handleReq(req,res);
            })
            if(this.enableMonitor){
            const ws=new (require('ws').Server)({noServer:true})
            this.server.on('upgrade',(req,socket,head)=>{
                if(req.url===this.monitorOptions.wsPath){
                    ws.handleUpgrade(req,socket,head,(ws)=>{
                        this.wsClients.add(ws);
                        ws.on('close',()=>this.wsClients.delete(ws));
                    });
                }
            })
            this.staticAssets = {
            html: fs.readFileSync(__dirname + '/ui/monitor.html'),
            js: fs.readFileSync(__dirname + '/ui/monitor.js').toString().replace('__WS_PATH__', this.monitorOptions.wsPath)
        };
        }
            this.server.listen(this.port,this.host,()=>{
                console.log(`server on ${this.port}`);
                resolve()
            })
        })
    } 

    async stop(){
        return new Promise((resolve,reject)=>{
            this.server.close(()=>{
                console.log("Server closed");
                resolve();
            })
        })
    }
    useRouter(router){
        this.router=router;
    }
    addRoute(path,method,handler){
        if(this.router){
            this.router.addRoute(path,method,handler);
        }else{
            throw new Error("router doesnt exist");
        }
    }
    findRoute(path,method){
        return this.router.findRoute(path,method)
    }
    addCache(options={}){
        this.client.cache=new Cache(options);
    }
    setLBAlgorithm(algo){
        this.loadBalancer.algorithm=algo;
    }
    addService(service,target=[]){
        this.loadBalancer.addService(service,target);
    }
    async handleReq(req,res){
        try {
            if (this.enableMonitor) {
                const { uiPath } = this.monitorOptions;
                if (req.url === uiPath) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    return res.end(this.staticAssets.html);
                }
                if (req.url === "/__proxy/monitor.js") {
                    res.writeHead(200, { 'Content-Type': 'application/javascript' });
                    return res.end(this.staticAssets.js);
                }
                if(req.url=== "/__proxy/status"){
                    res.writeHead(200,{'Content-Type': 'application/json'});
                    return res.end(JSON.stringify({
                        routes:this.router.dump(),
                        cache:this.client.metric,  //Update this to be handled by cache class.
                        loadBalancer:this.loadBalancer.getStatus(),
                    }))
                }
            }

            const urll=req.url
            console.log(urll);
            const route=this.findRoute(urll,req.method)
            const routeObject=route?.handler(route.params);
            if(!routeObject){
                throw new Error("Invalid route:" `${route}`);
                
            }
            let target;
            let targetObject
            if(routeObject.type==='direct'){
                target=routeObject.url;
            }else if (routeObject.type==='service') {
                targetObject=this.loadBalancer.getTarget(routeObject.name);
                target=targetObject.url;
            }else{
                throw new Error('Unknown routing type');
            }
            const options = {
                target:new URL(target),
                hostname: target.host,
                port: target.port,
                path: req.url,
                method: req.method,
                urlParams:route.params,
                };
                await this.client.makeReq({req:req,res:res,options:options})
                if(targetObject){
                    this.loadBalancer.releaseTarget(routeObject.name,targetObject)
                }
                res.writeHead(res.statusCode,res.headers)
                res.end(res.body);

        } catch (error) {
            console.log(error)
        }
    }
    use(middleware){
        this.middlewareManager.use(middleware);
    }
}

class httpClient {
    constructor(options={}){
        this.timeout=options.timeout || 3000;
        this.cache=null;
        this.agentPool= new Map();
        this.metric={
            cacheHits:0,
            cacheMiss:0,
            totalRequests:0,
            totalTime:0,
        }
    }
    getAgent(target){
        const key=`${target.hostname}:${target.port}`;
        if (!this.agentPool.has(key)) {
            const agent = new http.Agent({
                keepAlive: true,
                maxSockets: 100,       
                keepAliveMsecs: 30000,  
            });
            this.agentPool.set(key, agent);
        }
        return this.agentPool.get(key);
    }
    async makeReq(data){
        const starttime=Date.now();
        return new Promise((resolve,reject)=>{
            const target=data.options.target
            const agent=this.getAgent(target);
            const options={
                starttime:starttime,
                target:target,
                hostname: target.host,
                port: target.port,
                path: target.pathname,
                method: data.req.method,
                headers:data.req.headers,
                timeout:this.timeout,
                agent:agent,
            }
            this.metric.totalRequests++;
            let part=null;
            if(this.cache){
                const key=this.cache.keyGenerator(options);   // Note to self, generalise this to integrate with other caching methods (ex. Redis)
                part=this.cache.memory.get(key);}
            if(part){
                console.log('cache_hit');
                data.res.statusCode=part.statusCode;
                data.res.headers={...part.headers};
                data.res.body=part.body
                this.metric.cacheHits++;
                resolve(data)
            }
            else{
            console.log('cache_miss');
            this.metric.cacheMiss++;
            const ProxyReq=http.request(options,(ProxyRes)=>{
                const isCacheable=this.cache;
                const key=this.cache?.keyGenerator(options)
                const cacheStream= isCacheable?new PassThrough() :null;
                
                if(isCacheable){
                    let cacheBody=[]
                    cacheStream.on('data',(chunk)=>{
                        cacheBody.push(chunk);
                    })
                    cacheStream.on('end',()=>{
                        this.cache.memory.set(key,{
                            statusCode: ProxyRes.statusCode,
                            headers: ProxyRes.headers,
                            body: Buffer.concat(cacheBody),
                        })
                        console.log('cached stored')
                    })
                }
                data.res.writeHead(ProxyRes.statusCode,ProxyRes.headers);
                const tee=new PassThrough();

                pipeline(ProxyRes,tee,(err)=>{
                    if (err) console.error('Stream error from backend:', err);
                })

                pipeline(tee,data.res,(err) => {
                    if (err) console.error('Client write failed:', err);
                    resolve();
                })
                if (isCacheable) {
                    pipeline(tee, cacheStream, (err) => {
                    if (err) console.error('Cache stream error:', err);
                    });
                }
                
            })
            ProxyReq.on('timeout',()=>{
                    ProxyReq.destroy();
                    console.log("proxyReq destroy")
                    reject();
            })
            ProxyReq.on('error', (error) => {
                console.log(error)
                reject(error);
            });
            pipeline(data.req,ProxyReq,(err) => {
            if (err) {
                ProxyReq.destroy();
                console.error('Request stream error:', err);
            }
            })
            }
        this.metric.totalTime+=Date.now()- starttime;   
        })
        
    }
    broadcastInspector(proxy, payload) {
        if (!proxy?.enableInspector) return;
            const msg = JSON.stringify(payload);
            proxy.wsClients.forEach(ws => {
                if (ws.readyState === 1) ws.send(msg);
        });
    }
}
function proxy(options={}){
    return new httpProxy(options);
}
module.exports={proxy}