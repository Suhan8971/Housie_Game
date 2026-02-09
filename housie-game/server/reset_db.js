require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust path as needed
const Transaction = require('./models/Transaction');

const resetDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Delete all users
        const userResult = await User.deleteMany({});
        console.log(`Deleted ${userResult.deletedCount} users.`);

        // Delete all transactions (optional, but good for clean slate)
        const txnResult = await Transaction.deleteMany({});
        console.log(`Deleted ${txnResult.deletedCount} transactions.`);

        console.log('Database Reset Successfully');
        process.exit(0);
    } catch (err) {
        console.error('Reset Failed:', err);
        process.exit(1);
    }
};

resetDB();
