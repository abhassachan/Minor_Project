const express = require('express');
const router = express.Router();
const Clan = require('../models/Clan');
const User = require('../models/User');
const Message = require('../models/Message');
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
        console.error('Clan create error:', err);
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

        // Post system message to chat
        const joiner = await User.findById(req.userId).select('name');
        await Message.create({
            clan: clan._id,
            sender: req.userId,
            text: `${joiner.name} joined the clan!`,
            type: 'system',
        });

        res.json({ message: `Successfully joined ${clan.name}`, clan });
    } catch (err) {
        console.error('Clan join error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/clans/code/:code
// @desc    Get clan info by invite code (for invite link previews)
// @access  Public
router.get('/code/:code', async (req, res) => {
    try {
        const clan = await Clan.findOne({ code: req.params.code.toUpperCase() })
            .populate('creator', 'name profilePic')
            .populate('members', 'name profilePic');

        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        res.json({
            _id: clan._id,
            name: clan.name,
            code: clan.code,
            creator: clan.creator,
            memberCount: clan.members.length,
            members: clan.members.slice(0, 5), // Preview first 5 members
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/clans/leave
// @desc    Leave current clan
// @access  Private
router.post('/leave', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user.clanId) {
            return res.status(400).json({ error: 'You are not in a clan' });
        }

        const clan = await Clan.findById(user.clanId);
        if (!clan) {
            // Clan was deleted, just clear user's clanId
            user.clanId = null;
            await user.save();
            return res.json({ message: 'Left clan' });
        }

        // Remove user from members
        clan.members = clan.members.filter(m => m.toString() !== req.userId);

        // If creator is leaving and there are other members, transfer ownership
        if (clan.creator.toString() === req.userId && clan.members.length > 0) {
            clan.creator = clan.members[0];
        }

        // If no members left, delete the clan
        if (clan.members.length === 0) {
            await Clan.findByIdAndDelete(clan._id);
        } else {
            await clan.save();
        }

        user.clanId = null;
        await user.save();

        res.json({ message: 'Successfully left the clan' });
    } catch (err) {
        console.error('Clan leave error:', err);
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

// ── CHAT ENDPOINTS ────────────────────────────────────

// @route   GET /api/clans/:clanId/messages
// @desc    Get recent chat messages for a clan
// @access  Private
router.get('/:clanId/messages', auth, async (req, res) => {
    try {
        const clan = await Clan.findById(req.params.clanId);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        // Check if user is a member
        const isMember = clan.members.some(m => m.toString() === req.userId);
        if (!isMember) return res.status(403).json({ error: 'Not a member of this clan' });

        // Pagination: ?before=<messageId> for older messages
        const limit = parseInt(req.query.limit) || 50;
        const query = { clan: req.params.clanId };

        // If 'after' param is provided, only get messages newer than that ID
        if (req.query.after) {
            query._id = { $gt: req.query.after };
        }

        const messages = await Message.find(query)
            .populate('sender', 'name profilePic')
            .sort({ createdAt: 1 })  // oldest first (for chat display)
            .limit(limit);

        res.json({ messages });
    } catch (err) {
        console.error('Fetch messages error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/clans/:clanId/messages
// @desc    Send a message to clan chat
// @access  Private
router.post('/:clanId/messages', auth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ error: 'Message text is required' });

        const clan = await Clan.findById(req.params.clanId);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        // Check if user is a member
        const isMember = clan.members.some(m => m.toString() === req.userId);
        if (!isMember) return res.status(403).json({ error: 'Not a member of this clan' });

        const message = await Message.create({
            clan: req.params.clanId,
            sender: req.userId,
            text: text.trim(),
            type: 'text',
        });

        // Populate sender for response
        await message.populate('sender', 'name profilePic');

        res.status(201).json({ message });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/clans/:clanId/messages/read
// @desc    Mark unread messages in the clan as read
// @access  Private
router.post('/:clanId/messages/read', auth, async (req, res) => {
    try {
        const clan = await Clan.findById(req.params.clanId);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        // Check if user is a member
        const isMember = clan.members.some(m => m.toString() === req.userId);
        if (!isMember) return res.status(403).json({ error: 'Not a member of this clan' });

        // Update all messages in this clan where sender is NOT the current user
        // and the current user hasn't read it yet.
        await Message.updateMany(
            { 
                clan: req.params.clanId, 
                sender: { $ne: req.userId },
                readBy: { $ne: req.userId }
            },
            { $addToSet: { readBy: req.userId } }
        );

        res.json({ message: 'Messages marked as read' });
    } catch (err) {
        console.error('Mark read error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
