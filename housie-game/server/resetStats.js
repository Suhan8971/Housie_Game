const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const GameHistory = require('./models/GameHistory');
const Transaction = require('./models/Transaction');

const resetData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Reset User Stats
        await User.updateMany({}, {
            wins: 0,
            losses: 0,
            // Option: Keep coins or reset? User asked to "clear all user data". 
            // I'll reset coins to default 100 for a fresh start feel, or keep them. 
            // Let's reset wins/losses/history strictly. 
            // If I reset coins, they might lose purchased coins. I'll ask or just reset stats.
            // "win/loss statistics are not displaying the correct counts" -> Reset those.
        });
        console.log('User stats reset (wins/losses set to 0)');

        // Clear Game History
        await GameHistory.deleteMany({});
        console.log('Game History cleared');

        // Clear Transactions (Optional, but good for "clean slate")
        // await Transaction.deleteMany({});
        // console.log('Transactions cleared');

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

resetData();
