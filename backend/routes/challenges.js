const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const auth = require('../middleware/auth');

// @route   GET /api/challenges/active
// @desc    Get all active global challenges
// @access  Private
router.get('/active', auth, async (req, res) => {
    try {
        // Find challenges that are active and either don't expire or expire in the future
        const challenges = await Challenge.find({
            isActive: true,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
        }).sort({ createdAt: -1 });

        res.json({ challenges });
    } catch (err) {
        console.error('Fetch challenges error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/challenges/admin
// @desc    Create a new dynamic challenge (Developer/Admin only)
// @access  Public (protected by secret key)
router.post('/admin', async (req, res) => {
    try {
        const adminSecret = req.headers['x-admin-secret'];
        
        // Use environment variable if set, otherwise fallback to a hardcoded secret for dev
        const expectedSecret = process.env.ADMIN_SECRET || 'super_secret_admin_key_123';

        if (adminSecret !== expectedSecret) {
            return res.status(403).json({ error: 'Unauthorized: Invalid admin secret' });
        }

        const { title, description, metric, targetValue, xpReward, expiresAt } = req.body;

        if (!title || !description || !metric || !targetValue || !xpReward) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const challenge = new Challenge({
            title,
            description,
            metric,
            targetValue,
            xpReward,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
        });

        await challenge.save();
        res.status(201).json({ message: 'Challenge created successfully', challenge });
    } catch (err) {
        console.error('Create challenge error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PUT /api/challenges/admin/:id
// @desc    Update or deactivate a challenge
// @access  Public (protected by secret key)
router.put('/admin/:id', async (req, res) => {
    try {
        const adminSecret = req.headers['x-admin-secret'];
        const expectedSecret = process.env.ADMIN_SECRET || 'super_secret_admin_key_123';

        if (adminSecret !== expectedSecret) {
            return res.status(403).json({ error: 'Unauthorized: Invalid admin secret' });
        }

        const challenge = await Challenge.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        res.json({ message: 'Challenge updated', challenge });
    } catch (err) {
        console.error('Update challenge error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
