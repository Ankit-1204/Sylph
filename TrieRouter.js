class BaseRouter{
    constructor(){
    this.children= new Map();
    this.handler=new Map();
    this.params=[];
    }
}

const http_methods={
    GET:'GET',
    HEAD:'HEAD',
    POST:'POST',
    PUT:'PUT',
    DELETE:'DELETE',
    CONNECT:'CONNECT',
    TRACE:'TRACE',
    OPTIONS:'OPTIONS',
    PATCH:'PATCH'
}
class TrieRouter{
    constructor(){
        this.root=new BaseRouter()
    }   
    addRouter(path,method,handler){
        if (typeof path !== "string" || path[0] !== "/") throw new Error("Malformed path provided.");
        if (typeof handler !== "function") throw new Error("Handler should be a function");
        
        if(!http_methods[method]){
            throw new Error("Invalid http method");
            
        }
        let routePath=path.split('/').filter(Boolean)
        let currentNode=this.root;
        let dynamicParams=[];
        for (let index = 0; index < routePath.length; index++) {
            let part=routePath[index].toLowerCase();
            if(part.includes(" ")){
                throw new Error("Wrong format of path");
            }
            let val=null;
            if(part[0]===':'){
                val=part.substring(1);
                part=part[0];
                if(val===''){
                    throw new Error("Provide a param name");   
                }
                dynamicParams.push(val)
            }
            let childroot=currentNode.root.children.get(part);
            if(!childroot){
                childroot=new BaseRouter()
                currentNode.children.set(part,childroot)
            }
            currentNode=childroot;
        }
        currentNode.params=dynamicParams;
        currentNode.handler.set(method,handler)
    }
    findRouter(path,method){
        let routePath=path.split('/').filter(Boolean)
        let currentNode=this.root;
        let paramsArray=[];
        for (let index = 0; index < routePath.length; index++) {
            const part=routePath[index].toLowerCase();
            let childnode= currentNode.children.get(part);
            if(childnode){
                currentNode=childnode
            }else if(currentNode.children.get(':')){
                currentNode=currentNode.children.get(':');
                paramsArray.push(part);
            }
            else{
                return null;
            }
        }
        let params=Object.create(null)
        for (let index = 0; index < paramsArray.length; index++) {
            params[currentNode.params[index]]=paramsArray[index]
        }
        return currentNode.handler.get(params,method);
    }
}