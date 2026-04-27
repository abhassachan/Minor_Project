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
            .limit(50); // Increased limit to show more players

        // Calculate promotion/demotion zones
        const rankings = leagueUsers.map((u, i) => {
            let zone = 'safe';
            if (i < 5 && u.league.name !== 'Conqueror') zone = 'promotion';
            else if (i >= 15 && u.league.name !== 'Bronze') zone = 'demotion';

            return {
                rank: i + 1,
                _id: u._id,
                name: u.name,
                username: u.username,
                weeklyXP: u.weeklyXP,
                league: u.league.name,
                profilePic: u.profilePic,
                isYou: u._id.toString() === req.userId,
                zone,
            };
        });

        res.json({
            league: user.league.name,
            rankings,
            totalPlayers: leagueUsers.length,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// ── GET /api/leaderboard/weekly-rewards — Complete new weekly leaderboard for FitCoins ──
router.get('/weekly-rewards', auth, async (req, res) => {
    try {
        // Global weekly leaderboard sorted by weeklyXP
        const users = await User.find()
            .select('name username weeklyXP league profilePic fitCoins')
            .sort({ weeklyXP: -1 })
            .limit(100);

        const rankings = users.map((u, i) => ({
            rank: i + 1,
            _id: u._id,
            name: u.name || 'Unknown',
            username: u.username || '',
            weeklyXP: u.weeklyXP || 0,
            fitCoins: u.fitCoins || 0,
            league: u.league?.name || 'Bronze',
            profilePic: u.profilePic || '',
            isYou: u._id.toString() === req.userId,
            potentialReward: i === 0 ? 500 : 0 // Top player gets 500
        }));

        res.json({ rankings });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch weekly rewards leaderboard' });
    }
});

// Helper: Haversine distance
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ── GET /api/leaderboard/global — All-time rankings ──
router.get('/global', auth, async (req, res) => {
    try {
        const tab = req.query.tab || 'distance'; // area, distance, loops
        
        let sortField = 'totalDistance';
        if (tab === 'area') sortField = 'totalArea';
        if (tab === 'loops') sortField = 'totalLoops';

        // Query users directly since we added these stats to User model in Phase A
        let users = await User.find()
            .select(`name username league profilePic ${sortField}`)
            .sort({ [sortField]: -1 })
            .limit(50);

        const rankings = users.map((u, i) => ({
            rank: i + 1,
            name: u.name || 'Unknown',
            username: u.username || '',
            score: u[sortField] || 0,
            league: u.league?.name || 'Bronze',
            profilePic: u.profilePic || '',
            isYou: u._id.toString() === req.userId,
        }));

        res.json({ rankings });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch global leaderboard' });
    }
});

// ── GET /api/leaderboard/local — Local rankings within 10km ──
router.get('/local', auth, async (req, res) => {
    try {
        const { lat, lng, tab } = req.query;
        if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

        let sortField = 'totalDistance';
        if (tab === 'area') sortField = 'totalArea';
        if (tab === 'loops') sortField = 'totalLoops';

        // Fetch all users (in a real app, use MongoDB Geospatial $near index)
        const allUsers = await User.find().select(`name username league profilePic ${sortField}`);
        
        // Let's assume we can get last known coordinates for user from their recent runs
        // For now, if we don't have location on User, we simulate it or rely on runs.
        const Run = require('../models/Run');
        
        // Find recent runs near this location to identify local users
        const recentRuns = await Run.find().select('user route distance').limit(500);
        const localUserIds = new Set();
        
        recentRuns.forEach(run => {
            if (run.route && run.route.length > 0) {
                // Check if run started near the requested lat/lng
                const runLat = run.route[0][0];
                const runLng = run.route[0][1];
                if (haversineDistance(parseFloat(lat), parseFloat(lng), runLat, runLng) <= 10000) { // 10km
                    localUserIds.add(run.user.toString());
                }
            }
        });

        const localUsers = allUsers
            .filter(u => localUserIds.has(u._id.toString()) || u._id.toString() === req.userId)
            .sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0))
            .slice(0, 50);

        const rankings = localUsers.map((u, i) => ({
            rank: i + 1,
            name: u.name,
            username: u.username,
            score: u[sortField] || 0,
            league: u.league?.name || 'Bronze',
            profilePic: u.profilePic || '',
            isYou: u._id.toString() === req.userId,
        }));

        res.json({ rankings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch local leaderboard' });
    }
});

// ── GET /api/leaderboard/clan/:clanId ──
router.get('/clan/:clanId', auth, async (req, res) => {
    try {
        const tab = req.query.tab || 'distance';
        let sortField = 'totalDistance';
        if (tab === 'area') sortField = 'totalArea';
        if (tab === 'loops') sortField = 'totalLoops';

        const clanUsers = await User.find({ clanId: req.params.clanId })
            .select(`name username league profilePic ${sortField}`)
            .sort({ [sortField]: -1 });

        const rankings = clanUsers.map((u, i) => ({
            rank: i + 1,
            name: u.name,
            username: u.username,
            score: u[sortField] || 0,
            league: u.league?.name || 'Bronze',
            profilePic: u.profilePic || '',
            isYou: u._id.toString() === req.userId,
        }));

        res.json({ rankings });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch clan leaderboard' });
    }
});

module.exports = router;
