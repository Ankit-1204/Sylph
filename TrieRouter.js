class BaseRouter{
    constructor(){
    this.children= new Map();
    this.handler=null;
    }
}

class TrieRouter{
    constructor(){
        this.root=new BaseRouter()
    }   
    addRouter(path,handler){
        if (typeof path !== "string" || path[0] !== "/") throw new Error("Malformed path provided.");
        if (typeof handler !== "function") throw new Error("Handler should be a function");

        let routePath=path.split('/').filter(Boolean)
        let currentNode=this.root;
        for (let index = 0; index < routePath.length; index++) {
            const part=routePath[index].toLowerCase();
            if(part.includes(" ")){
                throw new Error("Wrong format of path");
            }
            let childroot=currentNode.root.children.get(part);
            if(!childroot){
                childroot=new BaseRouter()
                currentNode.root.children.set(part,childroot)
            }
            currentNode=childroot;
        }
        currentNode.handler=handler
    }
    findRouter(path){
        let routePath=path.split('/').filter(Boolean)
        let currentNode=this.root;
        for (let index = 0; index < routePath.length; index++) {
            const part=routePath[index].toLowerCase();
            let childnode= currentNode.children.get(part);
            if(!childnode){
                
            }
            
        }
    }
}