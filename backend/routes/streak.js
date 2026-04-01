const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ── GET /api/streak — Get user's streak data ──
router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('streak runDates');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            current: user.streak.current,
            longest: user.streak.longest,
            lastRunDate: user.streak.lastRunDate,
            runDates: user.runDates, // for calendar display
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch streak' });
    }
});

module.exports = router;
