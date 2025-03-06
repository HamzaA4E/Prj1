const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const UserSchema = new mongoose.Schema({
    userId: { 
        type: Number,
        unique: true
    },
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    rooms: [{ 
        type: String 
    }],
    unreadMessages: {
        type: Map,
        of: Number,
        default: () => new Map()
    },
    mentions: {
        type: Map,
        of: Boolean,
        default: () => new Map()
    },
    notifications: [{
        room: String,
        message: String,
        timestamp: { 
            type: Date, 
            default: Date.now 
        }
    }]
});

// Appliquer l'auto-incrémentation pour userId
UserSchema.plugin(AutoIncrement, { 
    inc_field: 'userId', 
    start_seq: 20251 // Démarre la séquence à 20251
});

// Méthode pour ajouter une salle à l'utilisateur
UserSchema.methods.addRoom = function(room) {
    if (!this.rooms.includes(room)) {
        this.rooms.push(room);
    }
};

module.exports = mongoose.model('User', UserSchema);