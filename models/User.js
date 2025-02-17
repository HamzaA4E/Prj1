const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    rooms: {
        type: [String], // Tableau des salons visités
        default: []
    }
});

// Exporter le modèle pour pouvoir l'utiliser dans d'autres parties de l'application
module.exports = mongoose.model('User', UserSchema);
