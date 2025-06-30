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
        this.middlewareManager=new MiddlewareManager()
        this.router=options.router || new TrieRouter()
        this.loadBalancer=new Loadbalancer()
        this.enableMonitor=options.enableMonitor || false
        this.monitorOptions={
            uiPath:options.monitorOptions?.uiPath || '/dashboard',
            wsPath:options.monitorOptions?.wsPath || '/ws'
        }
    }

    async start() {
        if(this.enableMonitor){
            const ws=new (require('ws').Server)({noServer:true})
            this.client.on('upgrade',())
        }
        return new Promise((resolve,reject)=>{
            this.server=http.createServer(async (req,res)=>{
                await this.handleReq(req,res);
            })
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
        console.log('proxy find route')
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
        const starttime=Date.now();

        try {
            
            const urll=req.url
            const route=this.findRoute(urll,req.method)
            const routeObject=route.handler(route.params);
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
                starttime:starttime,
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
        return new Promise((resolve,reject)=>{
            const target=data.options.target
            const agent=this.getAgent(target);
            const options={
                target:target,
                hostname: target.host,
                port: target.port,
                path: target.pathname,
                method: data.req.method,
                headers:data.req.headers,
                timeout:this.timeout,
                agent:agent,
            }
            let part=null;
            if(this.cache){
                const key=this.cache.keyGenerator(options);   // Note to self, generalise this to integrate with other caching methods (ex. Redis)
                part=this.cache.memory.get(key);}
            if(part){
                console.log('cache_hit');
                data.res.statusCode=part.statusCode;
                data.res.headers={...part.headers};
                data.res.body=part.body
                resolve(data)
            }
            else{
            console.log('cache_miss');
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
            ProxyReq.end();}
        })
        
    }
}
function proxy(options={}){
    return new httpProxy(options);
}
module.exports={proxy}