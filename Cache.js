const LRUCache=require('lru-cache').LRUCache
class Cache{
    constructor(options={}){
        this.til=options.til;
        this.memory=new LRUCache({
            max:options.max || 1000,
            ttl:options.ttl || 1000 * 60,
        })
        this.varyHeaders=options.varyHeaders || ['accept-encoding']
        this.CACHEABLE_STATUS=options.CACHEABLE_STATUS || [200, 203, 300, 301, 302, 404, 410];
        this.CACHEABLE_METHODS=options.CACHEABLE_METHODS || ['GET', 'HEAD'];
    }

    isCacheable(req,res){
        return (this.CACHEABLE_METHODS.includes(req.method) && this.CACHEABLE_STATUS.includes(res.status))
    }

    keyGenerator(options){
        const method=options.method;
        let url=this.parseUrl(options.target);
        let headerPath=this.getHeaders(options.headers,this.varyHeaders);
        const finalPath=`${method}:${url}:${headerPath}`

        return finalPath;
    }
    getHeaders(headers,varyHeaders=[]){
        const headerPath=varyHeaders.map(h=>`${h}:${headers[h.toLowerCase()] || ""}`).join();
        return headerPath;
    }
    parseUrl(u){
        const params=[...u.searchParams.entries()]   // this gives something like -> [['a',1], ['b',2]]
        const sortedParams=params.sort((a,b)=>a[0].localeCompare(b[0])) // basically a comparater
        const paramsString=new URLSearchParams(sortedParams).toString()
        const normalisedPath=u.pathname + (paramsString ? `${paramsString}`:"");
        return normalisedPath;
    }
}

module.exports={Cache};