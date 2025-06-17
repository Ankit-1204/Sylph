const InmemoryStorage=require('./Inmemory')

class Cache{
    constructor(options={}){
        this.memory=new InmemoryStorage();
        this.til=options.til;
    }
    keyGenerator(req,varyHeaders=[]){
        const method=req.method;
        let url=new URL(req.url);
        
    }
    parseUrl(url){
        const u=new URL(url);
        const params=[...u.searchParams.entries()]   // this gives something like -> [['a',1], ['b',2]]
        const sortedParams=params.sort((a,b)=>a[0].localeCompare(b[0])) // basically a comparater
        const paramsString=new URLSearchParams(sortedParams).toString()
        const normalisedPath=u.pathname + (paramsString ? `${paramsString}`:"");
        return normalisedPath;
    }
}