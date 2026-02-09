const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @route   GET /api/user/profile
// @desc    Get current user profile (balance & history)
// Get Profile & History
router.get('/profile', auth, async (req, res) => {
    try {
        const User = require('../models/User');
        const Transaction = require('../models/Transaction'); // For Wallet History
        const GameHistory = require('../models/GameHistory'); // For Game History

        const user = await User.findById(req.user.id).select('-password');

        // Fetch Wallet History (Purchases only -> exclude GAME entries if mixed, or by type)
        // Since we are now using GameHistory for games, we assume Transaction is for Payments.
        // However, we previously logged 'GAME-ENTRY' to Transaction.
        // We should filter those OUT if we want "Purchases only".
        // Filter: tx.transactionId does NOT start with 'GAME-'

        const walletHistory = await Transaction.find({
            userId: req.user.id,
            transactionId: { $not: /^GAME-/ }
        }).sort({ createdAt: -1 });

        const gameHistory = await GameHistory.find({ userId: req.user.id }).sort({ playedAt: -1 });

        res.json({ user, walletHistory, gameHistory });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
