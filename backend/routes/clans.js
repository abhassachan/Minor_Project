const express = require('express');
const router = express.Router();
const Clan = require('../models/Clan');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Helper to generate a random 6-character code
function generateClanCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// @route   POST /api/clans
// @desc    Create a new clan
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Clan name is required' });

        const user = await User.findById(req.userId);
        if (user.clanId) {
            return res.status(400).json({ error: 'You are already in a clan' });
        }

        // Generate a unique code
        let code;
        let isUnique = false;
        while (!isUnique) {
            code = generateClanCode();
            const existing = await Clan.findOne({ code });
            if (!existing) isUnique = true;
        }

        const newClan = new Clan({
            name,
            code,
            creator: req.userId,
            members: [req.userId] // Creator is the first member
        });

        await newClan.save();

        // Update user with clanId
        user.clanId = newClan._id;
        await user.save();

        res.status(201).json({ message: 'Clan created successfully', clan: newClan });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/clans/join
// @desc    Join a clan using a code
// @access  Private
router.post('/join', auth, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Clan code is required' });

        const user = await User.findById(req.userId);
        if (user.clanId) {
            return res.status(400).json({ error: 'You are already in a clan. Leave it first.' });
        }

        const clan = await Clan.findOne({ code: code.toUpperCase() });
        if (!clan) {
            return res.status(404).json({ error: 'Invalid clan code' });
        }

        // Add user to clan members
        clan.members.push(req.userId);
        await clan.save();

        // Update user
        user.clanId = clan._id;
        await user.save();

        res.json({ message: `Successfully joined ${clan.name}`, clan });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/clans/:clanId
// @desc    Get detailed clan info & aggregated stats
// @access  Public
router.get('/:clanId', async (req, res) => {
    try {
        const clan = await Clan.findById(req.params.clanId)
            .populate('creator', 'name profilePic')
            .populate('members', 'name profilePic totalDistance totalArea weeklyXP');

        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        // Calculate up-to-date stats dynamically based on members
        let totalArea = 0, totalDistance = 0, totalLoops = 0;
        clan.members.forEach(member => {
            totalArea += member.totalArea || 0;
            totalDistance += member.totalDistance || 0;
            totalLoops += member.totalLoops || 0;
        });

        res.json({
            ...clan.toObject(),
            liveStats: { totalArea, totalDistance, totalLoops }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/clans/:clanId/leaderboard
// @desc    Get clan internal leaderboard (members ranked by area)
// @access  Public
router.get('/:clanId/leaderboard', async (req, res) => {
    try {
        const clan = await Clan.findById(req.params.clanId).populate('members', 'name profilePic totalArea totalDistance totalLoops');
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        // Sort members by total area descending
        const rankedMembers = clan.members.sort((a, b) => (b.totalArea || 0) - (a.totalArea || 0));

        res.json(rankedMembers);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
