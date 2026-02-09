const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @route   POST /api/payment/create-order
// @desc    Simulate creating an order for Mock Gateway
router.post('/create-order', auth, (req, res) => {
    // In real world, call Razorpay/Stripe API here
    const { amount, coins } = req.body;
    const orderId = `ORDER_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    res.json({ orderId, amount, coins, currency: 'INR' });
});

// @route   POST /api/payment/verify
// @desc    Verify payment and credit coins
router.post('/verify', auth, async (req, res) => {
    try {
        const { orderId, amount, coins, status } = req.body;

        if (status !== 'SUCCESS') {
            // Log failed transaction
            const failedTx = new Transaction({
                userId: req.user.id,
                transactionId: `TXN_FAIL_${Date.now()}`,
                orderId,
                amount,
                coins: 0,
                status: 'FAILED',
                paymentMethod: 'MOCK'
            });
            await failedTx.save();
            return res.json({ success: false, message: 'Payment Failed' });
        }

        // Credit coins
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.coins += coins;
        await user.save();

        // Log transaction
        const txn = new Transaction({
            userId: req.user.id,
            transactionId: `TXN_${Date.now()}`,
            orderId,
            amount,
            coins,
            status: 'SUCCESS',
            paymentMethod: 'MOCK'
        });
        await txn.save();

        res.json({
            success: true,
            message: 'Coins added successfully!',
            newBalance: user.coins
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
