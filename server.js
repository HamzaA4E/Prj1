require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');

const port = process.env.PORT || 4000; // Use PORT from .env or default to 4000
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname)));

// Store active users and rooms
const activeUsers = {};

// Run when a client connects
io.on('connection', (socket) => {
  

    // Listen for the username and room from the client
    socket.on('join-chat', ({ username, room }) => {
        socket.join(room);

        // Add the user to the active users list
        if (!activeUsers[room]) {
            activeUsers[room] = [];
        }
        activeUsers[room].push(username);

        // Welcome the user
        socket.emit('bot', `Welcome to UsChatting, ${username.charAt(0).toUpperCase() + username.slice(1)}!`);

        // Broadcast to all other users in the room
        socket.broadcast.to(room).emit('bot', `${username.charAt(0).toUpperCase() + username.slice(1)} has joined the chat`);

        // Send the updated list of active users to everyone in the room
        io.to(room).emit('active-users', activeUsers[room]);

        // Handle chat messages
        socket.on('chat-mssg', (msg) => {
            io.to(room).emit('message', { username, message: msg });
        });

        // Handle user disconnect
        socket.on('disconnect', () => {
            // Remove the user from the active users list
            activeUsers[room] = activeUsers[room].filter(user => user !== username);

            // Broadcast that the user has left
            io.to(room).emit('bot', `${username.charAt(0).toUpperCase() + username.slice(1)} has left the chat`);

            // Send the updated list of active users
            io.to(room).emit('active-users', activeUsers[room]);
        });
    });
});

server.listen(port, () => {
    console.log(`Your app is running at http://localhost:${port}`);
});

// MONGO DB
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Sign-Up Route
app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Sign-In Route
app.post('/signin', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    res.status(200).json({ message: 'Sign-in successful', username });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});
