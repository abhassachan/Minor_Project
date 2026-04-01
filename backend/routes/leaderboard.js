const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// ── GET /api/leaderboard — Weekly league leaderboard ──
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('league');
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Get all users in the same league, ranked by weeklyXP
        const leagueUsers = await User.find({ 'league.name': user.league.name })
            .select('name username weeklyXP league profilePic')
            .sort({ weeklyXP: -1 })
            .limit(10);

        // Calculate promotion/demotion zones
        const rankings = leagueUsers.map((u, i) => ({
            rank: i + 1,
            _id: u._id,
            name: u.name,
            username: u.username,
            weeklyXP: u.weeklyXP,
            league: u.league.name,
            profilePic: u.profilePic,
            isYou: u._id.toString() === req.userId,
            zone: i < 3 ? 'promotion' : i >= leagueUsers.length - 3 ? 'demotion' : 'safe',
        }));

        res.json({
            league: user.league.name,
            rankings,
            totalPlayers: leagueUsers.length,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// ── GET /api/leaderboard/global — All-time rankings ──
router.get('/global', auth, async (req, res) => {
    try {
        const Run = require('../models/Run');

        // Aggregate total XP per user
        const stats = await Run.aggregate([
            { $group: { _id: '$user', totalXP: { $sum: '$xpEarned' }, totalDistance: { $sum: '$distance' }, totalRuns: { $sum: 1 } } },
            { $sort: { totalXP: -1 } },
            { $limit: 50 },
        ]);

        // Populate user info
        const userIds = stats.map(s => s._id);
        const users = await User.find({ _id: { $in: userIds } }).select('name username league profilePic');
        const userMap = {};
        users.forEach(u => { userMap[u._id.toString()] = u; });

        const rankings = stats.map((s, i) => {
            const u = userMap[s._id.toString()];
            return {
                rank: i + 1,
                name: u?.name || 'Unknown',
                username: u?.username || '',
                totalXP: s.totalXP,
                totalDistance: s.totalDistance,
                totalRuns: s.totalRuns,
                league: u?.league?.name || 'Bronze',
                profilePic: u?.profilePic || '',
                isYou: s._id.toString() === req.userId,
            };
        });

        res.json({ rankings });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch global leaderboard' });
    }
});

module.exports = router;
