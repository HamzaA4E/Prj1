const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Token reçu :', token); // Log pour déboguer

    if (!token) {
        return res.status(401).json({ msg: 'Accès refusé, token manquant' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        console.error('Erreur de vérification du token :', err); // Log pour déboguer
        res.status(401).json({ msg: 'Token invalide' });
    }
};

module.exports = verifyToken; // Ensure this is exported correctly