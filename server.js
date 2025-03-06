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

// Fonction pour détecter les mentions dans un message
function detectMentions(message) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(message)) !== null) {
        mentions.push(match[1]); // match[1] contient le nom d'utilisateur sans le @
    }
    return mentions;
}

// Quand un client se connecte
io.on('connection', (socket) => {
    console.log('Un utilisateur s\'est connecté');

    // Rejoindre une salle
    socket.on('join-chat', async (data) => {
        const { username, room, token } = data;

        if (!username || !room || !token) {
            return socket.emit('error', 'Données manquantes');
        }

        try {
            // Récupérer l'utilisateur depuis la base de données
            const user = await User.findOne({ username });
            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }

            // Rejoindre la salle
            socket.join(room);
            socket.username = username;
            socket.room = room;

            // Envoyer un message de bot pour indiquer que l'utilisateur a rejoint le salon
            socket.broadcast.to(room).emit('bot', `${username} a rejoint le salon.`);

            // Charger les messages précédents
            const messages = await Message.find({ room }).sort({ timestamp: 1 });
            socket.emit('load-messages', messages);

            // Envoyer la liste initiale des salons avec compteurs et mentions
            const rooms = user.rooms.map(r => ({
                name: r,
                unreadCount: user.unreadMessages.get(r) || 0,
                isMentioned: user.mentions.get(r) || false
            }));
            socket.emit('update-room-list', rooms);

            // Ajouter l'utilisateur aux actifs et notifier
            if (!activeUsers[room]) activeUsers[room] = [];
            if (!activeUsers[room].includes(username)) activeUsers[room].push(username);
            io.to(room).emit('active-users', activeUsers[room]);
        } catch (err) {
            console.error('Erreur lors de la connexion au chat :', err);
            socket.emit('error', 'Erreur lors de la connexion');
        }
    
    });
    // Gérer l'envoi de messages
    socket.on('chat-mssg', async (data) => {
        const { message } = data;
        const mentions = detectMentions(message); // Détecter les mentions dans le message
        if (!socket.room || !socket.username) return;
    
        try {
            // Sauvegarder le message
            const newMessage = new Message({
                room: socket.room,
                username: socket.username,
                message: message,
                timestamp: new Date()
            });
            await newMessage.save();
    
            // Récupérer tous les utilisateurs de la salle
            const users = await User.find({ rooms: socket.room });
    
            // Mettre à jour les compteurs et les mentions pour chaque utilisateur
            await Promise.all(users.map(async (user) => {
                if (user.username !== socket.username) { // Ne pas incrémenter pour l'expéditeur
                    const currentCount = user.unreadMessages.get(socket.room) || 0;
                    const newCount = currentCount + 1;
                    user.unreadMessages.set(socket.room, newCount);
    
                    // Si l'utilisateur est mentionné, marquer la mention
                    if (mentions.includes(user.username)) {
                        user.mentions.set(socket.room, true); // Marquer comme mentionné
                    }
    
                    await user.save();
    
                    // Émettre l'événement à l'utilisateur spécifique
                    io.to(user.username).emit('update-unread', {
                        room: socket.room,
                        count: newCount
                    });
    
                    // Si l'utilisateur est mentionné, envoyer une notification
                    if (mentions.includes(user.username)) {
                        io.to(user.username).emit('new-notification', {
                            room: socket.room,
                            message: `Vous avez été mentionné dans ${socket.room}: ${message}`,
                            unreadCount: newCount
                        });
                    }
                }
            }));
    
            // Diffuser le message à tous dans la salle
            io.to(socket.room).emit('message', {
                username: socket.username,
                message: message,
                mentions: mentions, // Inclure les mentions dans le message
                timestamp: newMessage.timestamp // Inclure le timestamp
            });
    
            // Mettre à jour la liste des salons pour tous les utilisateurs connectés
            const updatedRooms = users.map(user => ({
                name: socket.room,
                unreadCount: user.unreadMessages.get(socket.room) || 0,
                isMentioned: user.mentions.get(socket.room) || false // Ajouter l'état de mention
            }));
            io.to(socket.room).emit('update-room-list', updatedRooms);
    
        } catch (err) {
            console.error('Erreur lors de l\'envoi du message :', err);
            socket.emit('error', 'Une erreur est survenue lors de l\'envoi du message');
        }
    });

    // Marquer les messages comme lus
    socket.on('read-messages', async ({ room }) => {
        if (!socket.username) return;

        try {
            const user = await User.findOne({ username: socket.username });
            if (user) {
                user.unreadMessages.set(room, 0);
                user.mentions.set(room, false); // Réinitialiser l'état de mention
                await user.save();

                // Émettre la mise à jour à l'utilisateur actuel
                socket.emit('update-unread', { room, count: 0 });

                // Mettre à jour la liste des salons pour cet utilisateur
                const rooms = user.rooms.map(r => ({
                    name: r,
                    unreadCount: user.unreadMessages.get(r) || 0,
                    isMentioned: user.mentions.get(r) || false // Inclure l'état de mention
                }));
                socket.emit('update-room-list', rooms);
            }
        } catch (err) {
            console.error('Erreur lors de la lecture des messages :', err);
        }
    });

    // Gérer la déconnexion d'un utilisateur
    socket.on('disconnect', () => {
        if (socket.room && socket.username) {
            activeUsers[socket.room] = activeUsers[socket.room].filter(user => user !== socket.username);
            io.to(socket.room).emit('bot', `${socket.username.charAt(0).toUpperCase() + socket.username.slice(1)} a quitté le chat`);
            io.to(socket.room).emit('active-users', activeUsers[socket.room]);
        }
        console.log('Un utilisateur s\'est déconnecté');
    });



    socket.on('add-members', async ({ roomName, usernames }) => {
        try {
            const room = await Room.findOne({ name: roomName });
            if (!room) {
                throw new Error('Salon non trouvé');
            }
    
            const users = await User.find({ username: { $in: usernames } });
            if (users.length === 0) {
                throw new Error('Aucun utilisateur trouvé');
            }
    
            users.forEach(async (user) => {
                if (!room.members.includes(user._id)) {
                    room.members.push(user._id);
                }
    
                if (!user.rooms.includes(roomName)) {
                    user.rooms.push(roomName);
                    await user.save();
    
                    // Émettre un événement pour mettre à jour la liste des salons de l'utilisateur
                    io.to(user.username).emit('update-room-list', {
                        rooms: user.rooms.map(r => ({
                            name: r,
                            unreadCount: user.unreadMessages.get(r) || 0,
                            isMentioned: user.mentions.get(r) || false
                        }))
                    });
                }
            });
    
            await room.save();
    
            socket.emit('add-members-success', { msg: 'Membres ajoutés avec succès' });
        } catch (err) {
            console.error('Erreur lors de l\'ajout des membres :', err);
            socket.emit('error', 'Une erreur est survenue lors de l\'ajout des membres');
        }
    });
});

// Démarrer le serveur
server.listen(port, () => {
    console.log(`Votre application est en cours d'exécution sur http://localhost:${port}`);
});

