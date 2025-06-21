const {proxy}=require('./HttpProxy')

const app=proxy();


// app.useRouter()
function f(){
    console.log('runs')
    return 'http://localhost:3000';
}
app.addRoute('/api','GET',f)
app.start()