const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Mock OTP Storage (In-Memory)
const otpStore = {}; // { email: otp }

// Generate simple 4 digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// @route   POST /api/auth/register
// @desc    Register a new user & send OTP
// @route   POST /api/auth/register
// @desc    Register a new user & send OTP (Store in memory temporarily)
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: 'User already exists' });

        // Generate OTPs
        const emailOtp = generateOTP();
        const phoneOtp = generateOTP();

        // Store in temporary memory
        // In production, use Redis. for now, object is fine.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        otpStore[email] = {
            userData: { name, email, phone, password: hashedPassword },
            emailOtp,
            phoneOtp
        };

        console.log(`[Devel OTP] Email OTP for ${email}: ${emailOtp}`);
        console.log(`[Devel OTP] Phone OTP for ${phone}: ${phoneOtp}`);

        res.json({
            message: 'OTPs sent. Check console.',
            emailOtp,
            phoneOtp
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify Both OTPs and Create Account
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, emailOtp, phoneOtp } = req.body;

        const pendingReg = otpStore[email];

        if (!pendingReg) {
            return res.status(400).json({ error: 'Registration expired or invalid email' });
        }

        if (pendingReg.emailOtp !== emailOtp || pendingReg.phoneOtp !== phoneOtp) {
            return res.status(400).json({ error: 'Invalid OTP(s)' });
        }

        // OTPs matched! Now save to DB
        const newUser = new User({
            ...pendingReg.userData,
            isVerified: true
        });

        await newUser.save();
        delete otpStore[email]; // Clear memory

        res.json({ success: true, message: 'Account verified and created successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP for unverified user
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.isVerified) return res.status(400).json({ error: 'User already verified' });

        // Generate OTP
        const otp = generateOTP();
        otpStore[email] = otp;
        console.log(`[Devel OTP] Resent OTP for ${email}: ${otp}`);

        res.json({ message: 'OTP resent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/auth/login
// @desc    Login and get token
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        console.log("Login attempt for:", identifier);

        // Check if existing user (by email or phone)
        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }]
        });

        if (!user) return res.status(400).json({ error: 'Invalid Credentials' });
        if (!user.isVerified) return res.status(400).json({ error: 'Account not verified' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid Credentials' });

        const payload = {
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '30d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, coins: user.coins } });
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
