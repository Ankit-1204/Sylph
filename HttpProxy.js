const http=require('http');
const fs=require('fs');


class httpProxy {
    constructor(port,host,target){
        this.port= port || 8080,
        this.host= host || 'localhost',
        this.target=target
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
            
        } catch (error) {
            
        }
    }
}