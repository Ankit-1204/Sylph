const http=require('http');
const {TrieRouter}=require('./TrieRouter')
const fs=require('fs');
const {MiddlewareManager}=require("./middleware");
const {Cache}=require('./Cache');
const { buffer } = require('stream/consumers');

class httpProxy {
    constructor(options={}){
        this.port= options.port || 8080,
        this.host= options.host || 'localhost',
        this.target=options.target,
        this.client=new httpClient(options.client || {})
        this.middlewareManager=new MiddlewareManager()
        this.router=options.router || new TrieRouter()
    }

    async start() {
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
    async handleReq(req,res){
        const starttime=Date.now();

        try {
            
            const urll=req.url
            const route=this.findRoute(urll,req.method)
            const target=route.handler(route.params);
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
    }

    async makeReq(data){
        return new Promise((resolve,reject)=>{
            const target=data.options.target
            const options={
                target:target,
                hostname: target.host,
                port: target.port,
                path: target.pathname,
                method: data.req.method,
                headers:data.req.headers,
                timeout:this.timeout
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
                let response=[];
                ProxyRes.on('data',(chunk)=>{
                    response.push(chunk)
                })
                ProxyRes.on('timeout',()=>{
                    ProxyRes.destroy();
                })
                ProxyRes.on('end',()=>{
                    data.res.statusCode=ProxyRes.statusCode;
                    data.res.headers={...ProxyRes.headers}
                    data.res.body=Buffer.concat(response);
                    if(this.cache){
                        const key=this.cache.keyGenerator(options);
                        this.cache.memory.set(key,{
                            statusCode:data.res.statusCode,
                            headers:data.res.headers,
                            body:data.res.body
                        })
                    }
                    resolve(data)
                })
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
            if(data.req.body){
                ProxyReq.write(data.req.body);
            }
            ProxyReq.end();}
        })
        
    }
}
function proxy(options={}){
    return new httpProxy(options);
}
module.exports={proxy}