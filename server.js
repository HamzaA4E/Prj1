const connectDB = require('./config/db'); // Importer la connexion à MongoDB
connectDB(); // Appeler la connexion

const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const Message = require('./models/Message');
const User = require('./models/User');
const Room = require('./models/Room'); // Importer le modèle Room

const port = process.env.PORT || 4000; // Utiliser PORT depuis .env ou par défaut 4000
const app = express();

app.use(express.json()); // Permet d'analyser le JSON reçu
app.use('/api/auth', require('./routes/auth'));

const server = http.createServer(app);
const io = socketio(server);

// Dossier statique pour servir les fichiers frontend
app.use(express.static(path.join(__dirname)));

// Stocker les utilisateurs actifs et les salles
const activeUsers = {};

// Quand un client se connecte
io.on('connection', (socket) => {
    console.log('Un utilisateur s\'est connecté');

    // Rejoindre une salle
    socket.on('join-chat', async ({ username, room, token }) => {
        socket.join(room);
        socket.username = username;
        socket.room = room;

        // Récupérer les anciens messages de la salle
        const messages = await Message.find({ room }).sort({ timestamp: 1 });
        socket.emit('load-messages', messages);

        // Réinitialiser le compteur de messages non lus pour cet utilisateur dans cette salle
        const user = await User.findOneAndUpdate(
            { username },
            { $set: { [`unreadMessages.${room}`]: 0 } },
            { new: true }
        );

        // Envoyer la liste des salles avec les compteurs non lus
        const rooms = user.rooms.map(r => ({
            name: r,
            unreadCount: user.unreadMessages.get(r) || 0
        }));
        socket.emit('update-room-list', rooms);

        // Réinitialiser le compteur dans le modèle Room
        const roomDoc = await Room.findOne({ name: room });
        if (roomDoc) {
            roomDoc.unreadCounts.set(username, 0);
            await roomDoc.save();
        }

        // Ajouter l'utilisateur à la liste des utilisateurs actifs
        if (!activeUsers[room]) {
            activeUsers[room] = [];
        }
        if (!activeUsers[room].includes(username)) {
            activeUsers[room].push(username);
        }

        // Envoyer les messages de bienvenue et la liste des utilisateurs actifs
        socket.emit('bot', `Welcome to UsChatting, ${username.charAt(0).toUpperCase() + username.slice(1)}!`);
        socket.broadcast.to(room).emit('bot', `${username.charAt(0).toUpperCase() + username.slice(1)} has joined the chat`);
        io.to(room).emit('active-users', activeUsers[room]);
    });

    // Gérer l'envoi de messages
    socket.on('chat-mssg', async (msg) => {
        if (!socket.room || !socket.username) return;

        // Sauvegarder le message
        const newMessage = new Message({
            room: socket.room,
            username: socket.username,
            message: msg
        });
        await newMessage.save();

        // Incrémenter les compteurs non lus pour les utilisateurs absents
        const users = await User.find({ rooms: socket.room });
        await Promise.all(users.map(async (user) => {
            if (user.username !== socket.username) {
                const current = user.unreadMessages.get(socket.room) || 0;
                user.unreadMessages.set(socket.room, current + 1);
                await user.save();

                // Notifier les utilisateurs concernés
                io.to(user.username).emit('update-unread', {
                    room: socket.room,
                    count: current + 1
                });
            }
        }));

        // Diffuser le message à tous les utilisateurs de la salle
        io.to(socket.room).emit('message', {
            username: socket.username,
            message: msg
        });
    });

    // Marquer les messages comme lus
    socket.on('read-messages', async ({ room }) => {
        if (!socket.username) return;

        const user = await User.findOne({ username: socket.username });
        if (user) {
            user.unreadMessages.set(room, 0);
            await user.save();
            socket.emit('update-unread', { room, count: 0 });
        }
    });

    // Gérer la déconnexion d'un utilisateur
    socket.on('disconnect', () => {
        if (socket.room && socket.username) {
            activeUsers[socket.room] = activeUsers[socket.room].filter(user => user !== socket.username);
            io.to(socket.room).emit('bot', `${socket.username.charAt(0).toUpperCase() + socket.username.slice(1)} has left the chat`);
            io.to(socket.room).emit('active-users', activeUsers[socket.room]);
        }
        console.log('Un utilisateur s\'est déconnecté');
    });
});

// Démarrer le serveur
server.listen(port, () => {
    console.log(`Votre application est en cours d'exécution sur http://localhost:${port}`);
});