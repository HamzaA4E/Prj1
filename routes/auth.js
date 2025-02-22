const express = require('express');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');

const Room = require('../models/Room'); // Importer le modèle Room
const Message = require('../models/Message');
const router = express.Router();

// Route protégée
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
            let user = await User.findOne({ username });
            if (user) {
                return res.status(400).json({ msg: 'L\'utilisateur existe déjà' });
            }

            // Hasher le mot de passe
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Créer un nouvel utilisateur
            user = new User({
                username,
                password: hashedPassword
            });

            // Enregistrer dans la base de données
            await user.save();

            res.status(201).json({ msg: 'Utilisateur inscrit avec succès' });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Erreur serveur');
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
            let user = await User.findOne({ username }).select('+password');
            if (!user) {
                return res.status(400).json({ msg: 'Utilisateur non trouvé' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Mot de passe incorrect' });
            }

            // Ajouter la salle si elle n'existe pas déjà
            if (room) {
                user.addRoom(room); // Utiliser la méthode du modèle pour éviter les doublons
                await user.save();
            }

            // Générer un token JWT
            const payload = { user: { id: user.id } };
            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '1h' },
                async (err, token) => {
                    if (err) throw err;

                    // Récupérer la liste des salons de l'utilisateur
                    const user = await User.findOne({ username });
                    const rooms = user.rooms.map(r => ({
                        name: r,
                        unreadCount: user.unreadMessages.get(r) || 0
                    }));

                    // Renvoyer le token et les salons
                    res.json({ token, rooms });
                }
            );
        } catch (err) {
            console.error(err.message);
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

        // Créer un nouveau salon
        const newRoom = new Room({ name: roomName });
        await newRoom.save();

        // Ajouter la salle à l'utilisateur
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'Utilisateur non trouvé' });
        }

        user.addRoom(roomName); // Utiliser la méthode du modèle pour éviter les doublons
        await user.save();

        res.status(201).json({ msg: 'Salon créé avec succès', room: newRoom });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erreur serveur');
    }
});

module.exports = router;