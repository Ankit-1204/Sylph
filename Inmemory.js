class InmemoryStorage{
    constructor(options={}){
        this.capacity=options.capacity
        this.memory= new Map();
    }
}


module.exports={InmemoryStorage};