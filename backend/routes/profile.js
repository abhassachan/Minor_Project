const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// ── GET /api/profile — Get logged-in user's profile ──
router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// ── PUT /api/profile — Update user profile ───────────
router.put('/', async (req, res) => {
    try {
        const { name, username } = req.body;
        const updates = {};

        if (name) updates.name = name;
        if (username) {
            // Check if username is taken by another user
            const existing = await User.findOne({ username, _id: { $ne: req.userId } });
            if (existing) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            updates.username = username;
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Profile updated', user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;
