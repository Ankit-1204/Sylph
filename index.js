const http=require('http');
const fs=require('fs');

const server =http.createServer((req,res)=>{
    console.log(req)
    for (let index = 0; index < 10; index++) {
        // setTimeout(()=>{
        //     res.write("hello :",JSON.stringify(index))
        //     console.log('Sending data: ' + index);
        // },5000)
        res.write(JSON.stringify(index))
    }
    res.end("Data sent successfully!");
});



server.listen(3000,()=>{
    console.log('Server is running on port 3000');
})