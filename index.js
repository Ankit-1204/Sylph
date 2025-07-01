const {proxy}=require('./HttpProxy')

const app=proxy({enableMonitor:true});


// app.useRouter()
function f(){
    console.log('runs')
    return {name:`testing`,type:'service'};
}
app.addService('testing',[{url:"http://localhost:3000"},{url:"http://localhost:3001"}])
app.addRoute('/api/:id','GET',f)
app.addCache()
app.start()