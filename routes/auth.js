const express = require('express');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const verifyToken = require('../middleware/verifyToken');
const router = express.Router();

// Route protégée pour tester l'authentification
router.get("/protected", verifyToken, (req, res) => {
    res.json({ msg: "Accès autorisé", user: req.user });
});

// Inscription utilisateur
router.post(
    '/signup',
    [
        check('username', 'Le nom d\'utilisateur est requis').not().isEmpty(),
        check('password', 'Le mot de passe doit contenir au moins 6 caractères').isLength({ min: 6 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        try {
            // Vérifier si l'utilisateur existe déjà
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ msg: 'Ce nom d\'utilisateur existe déjà.' });
            }
    
            // Hasher le mot de passe
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
    
            // Créer un nouvel utilisateur
            const newUser = new User({
                username,
                password: hashedPassword,
                rooms: [],
                unreadMessages: new Map(),
                mentions: new Map(),
            });
    
            await newUser.save();
    
            res.status(201).json({ msg: 'Inscription réussie !' });
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ msg: 'Erreur serveur.' });
        }
    }
);

// Connexion utilisateur
router.post(
    '/login',
    [
        check('username', 'Le nom d\'utilisateur est requis').not().isEmpty(),
        check('password', 'Le mot de passe est requis').not().isEmpty()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password, room } = req.body;

        try {
            // Trouver l'utilisateur dans la base de données
            const user = await User.findOne({ username }).select('+password');
            if (!user) {
                return res.status(400).json({ msg: 'Utilisateur non trouvé' });
            }

            // Vérifier le mot de passe
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Mot de passe incorrect' });
            }

            // Ajouter la salle si elle n'existe pas déjà
            if (room && !user.rooms.includes(room)) {
                user.rooms.push(room);
                await user.save();
            }

            // Générer un token JWT
            const payload = { user: { id: user._id, username: user.username } };
            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '1h' },
                (err, token) => {
                    if (err) {
                        console.error('Erreur lors de la génération du token :', err);
                        return res.status(500).json({ msg: 'Erreur lors de la génération du token' });
                    }

                    // Renvoyer le token et les salons de l'utilisateur
                    res.json({ 
                        token, 
                        rooms: user.rooms.map(r => ({
                            name: r,
                            unreadCount: user.unreadMessages.get(r) || 0
                        }))
                    });
                }
            );
        } catch (err) {
            console.error('Erreur lors de la connexion :', err);
            res.status(500).json({ msg: 'Erreur serveur' });
        }
    }
);
// Route pour rechercher des messages
router.get('/search-messages', async (req, res) => {
    const { room, query } = req.query;

    if (!room || !query) {
        return res.status(400).json({ msg: 'Room and query are required' });
    }

    try {
        const messages = await Message.find({
            room: room,
            message: { $regex: query, $options: 'i' } // Recherche insensible à la casse
        }).sort({ timestamp: 1 });

        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Route pour créer un salon
router.post('/create-room', verifyToken, async (req, res) => {
    const { roomName } = req.body;

    if (!roomName) {
        return res.status(400).json({ msg: 'Le nom du salon est requis' });
    }

    try {
        // Vérifier si le salon existe déjà
        const existingRoom = await Room.findOne({ name: roomName });
        if (existingRoom) {
            return res.status(400).json({ msg: 'Ce salon existe déjà' });
        }

        // Récupérer l'utilisateur authentifié (créateur du salon)
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'Utilisateur non trouvé' });
        }

        // Créer un nouveau salon avec le créateur comme seul membre
        const newRoom = new Room({
            name: roomName,
            creator: user.userId, // Utiliser le userId du créateur
            members: [user.userId] // Ajouter le créateur comme membre par défaut
        });

        await newRoom.save();

        // Ajouter la salle à l'utilisateur
        user.addRoom(roomName); // Utiliser la méthode du modèle pour éviter les doublons
        await user.save();

        // Renvoyer la liste mise à jour des salons de l'utilisateur
        const updatedRooms = user.rooms.map(r => ({
            name: r,
            unreadCount: user.unreadMessages.get(r) || 0,
            isMentioned: user.mentions.get(r) || false
        }));

        res.status(201).json({ msg: 'Salon créé avec succès', rooms: updatedRooms });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur serveur');
    }
});
// Route pour supprimer un ou plusieurs salons
router.delete('/delete-room', verifyToken, async (req, res) => {
    const { roomNames } = req.body;

    if (!roomNames || roomNames.length === 0) {
        return res.status(400).json({ msg: 'Aucun salon sélectionné' });
    }

    try {
        // Supprimer les salons de la base de données
        await Room.deleteMany({ name: { $in: roomNames } });

        // Supprimer les salons de la liste des salons de tous les utilisateurs
        await User.updateMany(
            { rooms: { $in: roomNames } },
            { $pull: { rooms: { $in: roomNames } } }
        );

        res.status(200).json({ msg: 'Salons supprimés avec succès' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur serveur');
    }
});

// Route pour quitter un salon
router.post('/leave-room', verifyToken, async (req, res) => {
    const { roomName } = req.body;

    if (!roomName) {
        return res.status(400).json({ msg: 'Le nom du salon est requis' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'Utilisateur non trouvé' });
        }

        // Retirer le salon de la liste des salons de l'utilisateur
        user.rooms = user.rooms.filter(room => room !== roomName);
        await user.save();

        res.status(200).json({ msg: 'Salon quitté avec succès' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur serveur');
    }
});

// Route pour ajouter des membres à un salon
router.post('/add-members', verifyToken, async (req, res) => {
    const { roomName, usernames } = req.body; // Utiliser "usernames" au lieu de "userIds"

    // Validation des entrées
    if (!roomName || !usernames || usernames.length === 0) {
        return res.status(400).json({ msg: 'Le nom du salon et les noms d\'utilisateurs sont requis' });
    }

    try {
        // Vérifier que l'utilisateur est authentifié
        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: 'Utilisateur non authentifié' });
        }

        // Trouver la salle par son nom
        const room = await Room.findOne({ name: roomName });
        if (!room) {
            return res.status(404).json({ msg: 'Salon non trouvé' });
        }

        // Trouver les utilisateurs par leurs noms d'utilisateur
        const users = await User.find({ username: { $in: usernames } });
        if (users.length === 0) {
            return res.status(404).json({ msg: 'Aucun utilisateur trouvé' });
        }

        // Ajouter les utilisateurs au salon
        const updatePromises = users.map(async (user) => {
            if (!room.members.includes(user.userId)) {
                room.members.push(user.userId);
            }

            if (!user.rooms.includes(roomName)) {
                user.rooms.push(roomName);
                await user.save();

                // Notifier l'utilisateur de la mise à jour
                io.to(user.username).emit('update-room-list', {
                    rooms: user.rooms.map(r => ({
                        name: r,
                        unreadCount: user.unreadMessages.get(r) || 0,
                        isMentioned: user.mentions.get(r) || false
                    }))
                });
            }
        });

        await Promise.all(updatePromises);
        await room.save();

        res.status(200).json({ msg: 'Membres ajoutés avec succès', room });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

// Route pour récupérer les membres d'un salon
router.get('/room-members', verifyToken, async (req, res) => {
    const { roomName } = req.query;

    if (!roomName) {
        return res.status(400).json({ msg: 'Le nom du salon est requis' });
    }

    try {
        const room = await Room.findOne({ name: roomName });
        if (!room) {
            return res.status(404).json({ msg: 'Salon non trouvé' });
        }

        // Trouver les utilisateurs par leurs userId
        const users = await User.find({ userId: { $in: room.members } });
        res.status(200).json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur serveur');
    }
});

// Route pour inviter un utilisateur à un salon
router.post('/invite-to-room', verifyToken, async (req, res) => {
    const { roomName, username } = req.body;

    if (!roomName || !username) {
        return res.status(400).json({ msg: 'Le nom du salon et le nom d\'utilisateur sont requis' });
    }

    try {
        // Vérifier si l'utilisateur existe
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ msg: 'Utilisateur non trouvé' });
        }

        // Ajouter le salon à la liste des salons de l'utilisateur
        user.addRoom(roomName);
        await user.save();

        res.status(200).json({ msg: 'Utilisateur invité avec succès', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur serveur');
    }
});

// Route pour récupérer les salons de l'utilisateur
router.get('/user-rooms', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'Utilisateur non trouvé' });
        }

        // Renvoyer la liste des salons avec les compteurs non lus et les mentions
        const rooms = user.rooms.map(r => ({
            name: r,
            unreadCount: user.unreadMessages.get(r) || 0,
            isMentioned: user.mentions.get(r) || false
        }));

        res.status(200).json({ rooms });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur serveur');
    }
});

// Route pour vérifier si un utilisateur existe
router.post('/check-user', async (req, res) => {
    const { id } = req.body; // Utiliser _id

    if (!id) {
        return res.status(400).json({ msg: 'L\'ID de l\'utilisateur est requis' });
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ msg: 'Utilisateur non trouvé' });
        }

        res.status(200).json({ msg: 'Utilisateur trouvé', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur serveur');
    }
});


// routes/auth.js
router.get('/user-info', verifyToken, async (req, res) => {
    try {
        // Récupérer l'utilisateur depuis la base de données
        const user = await User.findById(req.user.id).select('username userId');
        if (!user) {
            return res.status(404).json({ msg: 'Utilisateur non trouvé' });
        }

        // Renvoyer userId et username
        res.status(200).json({ userId: user.userId, username: user.username });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur serveur');
    }
});

module.exports = router;