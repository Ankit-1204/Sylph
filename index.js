const {proxy}=require('./HttpProxy')

const app=proxy();


// app.useRouter()
function f(params){
    console.log('runs')
    return `http://localhost:3000/${params.id}`;
}
app.addRoute('/api/:id','GET',f)
app.addCache()
app.start()