const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    unreadCounts: {
        type: Map,
        of: Number,
        default: () => new Map()
    },
    members: [{
        type: Number // Stocker les userId (nombres entiers)
    }],
    creator: {
        type: Number, // Stocker le userId du créateur
        required: true
    }
});

module.exports = mongoose.model('Room', RoomSchema);