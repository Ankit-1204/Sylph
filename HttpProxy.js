const http=require('http');
const fs=require('fs');


class httpProxy {
    constructor(options={}){
        this.port= options.port || 8080,
        this.host= options.host || 'localhost',
        this.target=options.target,
        this.client=httpClient(options.client || {})
    }

    async start() {
        return Promise((resolve,reject)=>{
            this.server=http.createServer(async (req,res)=>{
                await handle();
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
            
        } catch (error) {
            
        }
    }
}

class httpClient {
    constructor(options={}){
        this.timeout=options.timeout || 3000
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
            const proxyReq=http.request(options,(res)=>{
                let response=[];
                proxyReq.on('data',(chunk)=>{
                    response.push(chunk)
                })
                proxyReq.on('timeout',()=>{
                    proxyReq.destroy();
                })
            })
            if(data.request.body){
                proxyReq.write(data.request.body);
            }
            proxyReq.end();
        })
        
    }
}