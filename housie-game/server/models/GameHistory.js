const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: String, required: true },
    gameMode: { type: String, enum: ['FREE', 'PAID'], required: true },
    entryFee: { type: Number, required: true },
    winnings: { type: Number, default: 0 },
    result: { type: String, enum: ['WIN', 'LOSS'], required: true },
    playedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GameHistory', gameHistorySchema);
