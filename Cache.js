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
}