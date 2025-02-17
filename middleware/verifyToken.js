const jwt = require('jsonwebtoken');

// Middleware pour vérifier le token JWT
const verifyToken = (req, res, next) => {
    const token = req.header('x-auth-token');
    
    if (!token) {
        return res.status(401).json({ msg: 'Aucun token, accès interdit' });
    }

    try {
        // Vérifier le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // Stocker l'id de l'utilisateur dans req.user
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token invalide' });
    }
};

module.exports = verifyToken;
