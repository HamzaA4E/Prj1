const mongoose = require('mongoose');

// models/Room.js
const RoomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    unreadCounts: {
        type: Map,
        of: Number,
        default: () => new Map() // Initialiser avec une Map vide
    }
});
module.exports = mongoose.model('Room', RoomSchema);
