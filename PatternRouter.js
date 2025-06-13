
class PatternRouter{
    constructor(){
        this.routes=[];
    }
    addRoute(pattern, target, options = {}) {
    const route = {
      pattern: this.createPattern(pattern),
      target,
    //   target could be a string or object containing multiple targets with load balancing strategies.
      middleware: options.middleware || []
    };
    this.routes.push(route);
  }
  createPattern(pattern) {
    if (pattern instanceof RegExp) {
      return pattern;
    }
    
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexPattern = escaped.replace(/\\\*/g, '.*');
    return new RegExp(`^${regexPattern}$`);
  }

  findRoute(url) {
    for (const route of this.routes) {
      if (route.pattern.test(url)) {
        let target=route.target
        for (const ware of route.middleware) {
            ware(target);
        }
        return target;
      }
    }
    return null;
  }
}