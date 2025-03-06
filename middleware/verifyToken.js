const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ msg: 'Token non fourni' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // Assurez-vous que decoded contient bien userId
        console.log('Utilisateur authentifié :', req.user); // Log pour débogage
        next();
    } catch (err) {
        console.error('Erreur de vérification du token :', err);
        res.status(401).json({ msg: 'Token invalide' });
    }
};

module.exports = verifyToken;