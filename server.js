const express = require('express');
const http = require('http')
const path = require('path')
const socketio = require('socket.io')

const port = 4000;
const app = express();
const server = http.createServer(app);
const io = socketio(server);

//Set static folder
app.use(express.static(path.join(__dirname)))

//Run when a client connect
io.on('connection', (socket)=>
{
    console.log("A user has enter the chat")
})


server.listen(port, () =>
{
    console.log(`Your app is running at http://localhost:${port}`)
})