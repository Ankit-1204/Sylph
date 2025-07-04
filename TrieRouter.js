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
// Note: Have to also add query handling--> ? and & 
class TrieRouter{
    constructor(){
        this.root=new BaseRouter()
    }   
    addRoute(path,method,handler){
        if (typeof path !== "string" || path[0] !== "/") throw new Error("Malformed path provided.");
        if (typeof handler !== "function") throw new Error("Handler should be a function");
        
        if(!http_methods[method]){
            throw new Error("Invalid http method");
            
        }
        let routePath=path.split('/').filter(Boolean)
        console.log(routePath)
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
            let childroot=currentNode.children.get(part);
            if(!childroot){
                childroot=new BaseRouter()
                currentNode.children.set(part,childroot)
            }
            currentNode=childroot;
        }
        currentNode.params=dynamicParams;
        currentNode.handler.set(method,handler)
    }
    findRoute(path,method){
        let routePath=path.split('/').filter(Boolean)
        console.log(routePath)
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
                console.log('got null')
                return null;
            }
        }
        let params=Object.create(null)
        for (let index = 0; index < paramsArray.length; index++) {
            params[currentNode.params[index]]=paramsArray[index]
        }
        return {params:params,handler:currentNode.handler.get(method)};
    }
    dump(){
        const list=[];
        const dfs=(node,prefix)=>{
            if(!node){
                return;
            }
            if(node.handler){
                for(const [method,handler] of Object.entries(node.handler)){
                    list.push({
                        method,
                        path:prefix+'/',
                        handlerName:handler || 'Unknown',
                        params:node?.params
                    })
                }
            }
            for(const [segment,child] of Object.entries(node.children)){
                dfs(child,prefix+'/'+segment)
            }
        };
        dfs(this.root,"");
        return list;
    }
}

module.exports={TrieRouter};