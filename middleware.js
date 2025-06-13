class MiddlewareManager{
    constructor(){
        this.req_middleware=[];
        this.res_middleware=[];
    }
    use(middleware,type='request'){
        if (typeof(middleware) !== 'function') {
            throw new Error('Middleware must be a function');
        }
        switch (type) { 
            case 'request':
                this.req_middleware.push(middleware)
                break;
            case 'response':
                this.res_middleware.push(middleware)
                break;
            default:
                throw new Error("Invalid type provided");
        }
    }
    async execute(array,data){
        for (const ware of array) {
            try {
                const response=await ware(data);
            } catch (error) {
                throw new Error("Middleware execution failed");
                
            }
        }
    }
    
}
export default MiddlewareManager