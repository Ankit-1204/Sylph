const http=require('http');
const TrieRouter=require('./TrieRouter')
const fs=require('fs');
const MiddlewareManager=require("./middleware");
const Cache=require('./Cache');
const { buffer } = require('stream/consumers');

class httpProxy {
    constructor(options={}){
        this.port= options.port || 8080,
        this.host= options.host || 'localhost',
        this.target=options.target,
        this.client=httpClient(options.client || {})
        this.middlewareManager=MiddlewareManager()
        this.router=options.router || null
    }

    async start() {
        return Promise((resolve,reject)=>{
            this.server=http.createServer(async (req,res)=>{
                await handleReq(req,res);
            })
            this.server.listen(this.port,this.host,()=>{
                console.log(`server on ${this.port}`);
                resolve()
            })
        })
    }

    async stop(){
        return Promise((resolve,reject)=>{
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
        this.httpClient.cache=Cache(options);
    }
    async handleReq(req,res){
        const starttime=Date.now();

        try {
            const url=req.url
            const route=this.findRoute(req.path,req.method)
            const target=route.handler();
            const options = {
                starttime:starttime,
                hostname: target.host,
                port: target.port,
                path: req.url,
                method: req.method,
                urlParams:route.params,
            };
            await this.client.makeReq({req,res,options})
        } catch (error) {
            
        }
    }
    use(middleware){
        this.middlewareManager.use(middleware);
    }
}

class httpClient {
    constructor(options={}){
        this.timeout=options.timeout || 3000
        this.cache=null;
    }

    async makeReq(data){
        return Promise((resolve,reject),()=>{
            const target=url.parse(data.req.url)
            const options={
                hostname: target.host,
                port: target.port,
                path: req.url,
                method: req.method,
                headers:data.request.headers,
                timeout:this.timeout
            }
            if(this.cache){
                const key=this.cache.keyGenerator(req);   // Note to self, generalise this to integrate with other caching methods (ex. Redis)
                const part=this.cache.memory.get(key);
                if(part){
                    data.res.statusCode=part.statusCode;
                    data.res.headers={...part.headers};
                    data.res.headers=part.body
                }
            }
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
                    resolve(data)
                })
            })
            ProxyReq.on('timeout',()=>{
                    ProxyReq.destroy();
                    console.log("proxyReq destroy")
                    reject();
            })
            ProxyReq.on('error', (error) => {
                reject(error);
            });
            if(data.req.body){
                ProxyReq.write(data.req.body);
            }
            if(this.cache){
                const key=this.cache.keyGenerator(req);
                this.cache.memory.set(key,{
                    statusCode:data.res.statusCode,
                    headers:data.res.headers,
                    body:data.res.body
                })
            }
            ProxyReq.end();
        })
        
    }
}