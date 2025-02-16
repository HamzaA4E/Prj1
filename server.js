const express = require('express');
const http = require('http');
const path = require('path')
const socketio = require('socket.io')

const port = 4000;
const app = express();
const server = http.createServer(app);
const io = socketio(server);


//Set static folder
app.use(express.static(path.join(__dirname)))

//Run when a client connect
io.on('connection', (socket) => {
    console.log('A user has entered the chat');

    // Listen for the username from the client
    socket.on('join-chat', ({username,room}) => {

        socket.join(room)
        // Welcome the user
        socket.emit('bot', `Welcome to UsChatting, ${username}!`);
        

        // Broadcast to all other users
        socket.broadcast.to(room).emit('bot', `${username} has joined the chat`);

        // Handle chat messages
        socket.on('chat-mssg', (msg) => {
            io.to(room).emit('message', { username, message: msg }); // Sends username + message
        });

        // Handle user disconnect
        socket.on('disconnect', () => {
            io.to(room).emit('bot', `${username} has left the chat`);
        });
    });
});


server.listen(port, () =>
{
    console.log(`Your app is running at http://localhost:${port}`)
})