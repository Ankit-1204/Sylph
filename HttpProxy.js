const http=require('http');
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
    route(url){
        return;
    }
    addCache(options={}){
        this.httpClient.cache=Cache(options);
    }
    async handleReq(req,res){
        const starttime=Date.now();

        try {
            const url=req.url
            const target=route(url)
            const options = {
                hostname: target.host,
                port: target.port,
                path: req.url,
                method: req.method,
            };
            this.client.makeReq({req,res,options})
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
            const target=url.parse(data.url)
            const options={
                hostname: target.host,
                port: target.port,
                path: req.url,
                method: req.method,
                headers:data.request.headers,
                timeout:this.timeout
            }
            if(this.cache){
                const key=this.cache.keyGenerator(req);
                const part=this.cache.get(key);
                if(part){
                    data.res.statusCode=part.statusCode;
                    data.res.headers={...part.headers};
                }
            }
            const proxyReq=http.request(options,(res)=>{
                let response=[];
                proxyReq.on('data',(chunk)=>{
                    response.push(chunk)
                })
                proxyReq.on('timeout',()=>{
                    proxyReq.destroy();
                })
                proxyReq.on('end',()=>{
                    data.res.statusCode=proxyReq.statusCode;
                    data.res.headers={...proxyReq.headers}
                    data.res.body=Buffer.concat(response);
                })
            })
            if(data.req.body){
                proxyReq.write(data.req.body);
            }
            proxyReq.end();
        })
        
    }
}