const http=require('http');
const {TrieRouter}=require('./TrieRouter')
const fs=require('fs');
const {MiddlewareManager}=require("./middleware");
const {Cache}=require('./Cache');
const {Loadbalancer}=require('./Loadbalancer');
const {httpClient} =require('./httpClient')

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
                        this.client.on('close',()=>this.wsClients.delete(ws));
                    });
                }
            })
            this.staticAssets = {
            html: fs.readFileSync(__dirname + '/ui/monitor.html'),
            js: fs.readFileSync(__dirname + '/ui/monitor.js').toString().replace('__WS_PATH__', this.monitorOptions.wsPath),
            css: fs.readFileSync(__dirname+ '/ui/monitor.css')
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
                if(req.url === "/__proxy/monitor.css") {
                    res.writeHead(200, { 'Content-Type': 'application/javascript' });
                    return res.end(this.staticAssets.css);
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


function proxy(options={}){
    return new httpProxy(options);
}
module.exports={proxy}