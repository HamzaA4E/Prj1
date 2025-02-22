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
        required: true,
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    rooms: {
        type: [String],
        default: []
    },
    unreadMessages: {
        type: Map,
        of: Number,
        default: () => new Map().set('general', 0) // Initialisation explicite
    }
});

UserSchema.methods.addRoom = function(room) {
    if (!this.rooms.includes(room)) {
        this.rooms.push(room);
    }
};

module.exports = mongoose.model('User', UserSchema);