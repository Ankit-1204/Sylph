class Loadbalancer{
    constructor(){
        this.services={},
        this.algorithm='roundRobin'   
        this.counter={} 
    }
    addService(service,target=[]){
        this.services[service]=target.map((t)=>({
            url:new URL(t.url),
            weight:t.weight || 1,
            alive:true,
            activeConn:0,
            totalRequest:0
        }))
    }
    getTarget(service){
        const targetList=this.services[service]?.filter(t=>t.alive);
        let chosen;
        switch (this.algorithm) {
            case 'roundRobin':
                if(!this.counter[service]){
                    this.counter[service]=0;
                }
                const idx=(this.counter[service])%targetList.length;
                this.counter[service]+=1;
                chosen=targetList[idx];
                break;
            case 'leastConnections':
                chosen=targetList.reduce((a,b)=>a.activeConn<b.activeConn?a:b);
                break
            default:
                throw new Error("Invalid algorithm provided");
        }
        chosen.activeConn++;
        chosen.totalRequest++;
        return chosen
    }
    releaseTarget(service,target){
        const entry= this.services[service].find(t=>t.url.href===target.url.href);
        if (entry) entry.activeConn = Math.max(0, entry.activeConn - 1);
        return;
    }
}

module.exports={Loadbalancer};
// Look into improvements related to concurancy and backpressure .