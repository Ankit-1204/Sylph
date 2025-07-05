const { pipeline, PassThrough } = require('stream');
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
                data.res.statusCode=part.statusCode;
                data.res.headers={...part.headers};
                data.res.body=part.body
                this.metric.cacheHits++;
                resolve(data)
            }
            else{
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
                    reject();
            })
            ProxyReq.on('error', (error) => {
                console.log(error)
                reject(error);
            });
            pipeline(data.req,ProxyReq,(err) => {
            if (err) {
                ProxyReq.destroy();
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
module.exports={httpClient}