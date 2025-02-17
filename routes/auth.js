const express = require('express');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken'); // Importer le middleware

const router = express.Router();

router.get("/protected", verifyToken, (req, res) => {
    res.json({ msg: "Accès autorisé", user: req.user });
});

// @route   POST /api/auth/signup
// @desc    Inscription utilisateur
// @access  Public
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

// @route   POST /api/auth/login
// @desc    Connexion utilisateur
// @access  Public
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

        const { username, password } = req.body;

        try {
            // Vérifier si l'utilisateur existe
            let user = await User.findOne({ username });
            if (!user) {
                return res.status(400).json({ msg: 'Utilisateur non trouvé' });
            }

            // Vérifier le mot de passe
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Mot de passe incorrect' });
            }

            // Générer un token JWT
            const payload = { user: { id: user.id } };
            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '1h' }, // Le token expire dans 1h
                (err, token) => {
                    if (err) throw err;
                    res.json({ token });
                }
            );
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Erreur serveur');
        }
    }
);

// @route   GET /api/auth/protected
// @desc    Route protégée (requiert un token JWT valide)
// @access  Private


module.exports = router;
