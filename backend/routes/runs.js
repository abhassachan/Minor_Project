const express = require('express');
const Run = require('../models/Run');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes below require authentication
router.use(auth);

// Achievement definitions
const ACHIEVEMENTS = {
    first_run: { check: (totalRuns) => totalRuns >= 1, label: 'First Run' },
    '5_runs': { check: (totalRuns) => totalRuns >= 5, label: '5 Runs Complete' },
    '10_runs': { check: (totalRuns) => totalRuns >= 10, label: '10 Runs Complete' },
    '5k_conqueror': { check: (_, totalDist) => totalDist >= 5, label: '5K Conqueror' },
    '10k_warrior': { check: (_, totalDist) => totalDist >= 10, label: '10K Warrior' },
    '50k_legend': { check: (_, totalDist) => totalDist >= 50, label: '50K Legend' },
    '100k_god': { check: (_, totalDist) => totalDist >= 100, label: '100K God' },
    streak_7: { check: (_, __, streak) => streak >= 7, label: '7-Day Streak' },
    streak_30: { check: (_, __, streak) => streak >= 30, label: '30-Day Streak' },
    streak_100: { check: (_, __, streak) => streak >= 100, label: '100-Day Streak' },
};

// ── POST /api/runs — Save a new run ─────────────────
router.post('/', async (req, res) => {
    try {
        const { distance, duration, steps, calories, pace, route, territoriesCaptured } = req.body;

        if (!distance || !duration) {
            return res.status(400).json({ error: 'Distance and duration are required' });
        }

        // Calculate XP (100 XP per km + 50 per territory)
        const xpEarned = Math.round(distance * 100 + (territoriesCaptured || 0) * 50);

        const run = await Run.create({
            user: req.userId,
            distance,
            duration,
            steps: steps || 0,
            calories: calories || 0,
            pace: pace || 0,
            route: route || [],
            territoriesCaptured: territoriesCaptured || 0,
            xpEarned,
        });

        // ── Auto-update streak, weeklyXP, runDates, achievements ──
        const user = await User.findById(req.userId);
        if (user) {
            const today = new Date().toISOString().split('T')[0]; // "2026-04-01"
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const lastRun = user.streak.lastRunDate
                ? user.streak.lastRunDate.toISOString().split('T')[0]
                : null;

            // Update streak
            if (lastRun === today) {
                // Already ran today, no streak change
            } else if (lastRun === yesterday) {
                user.streak.current += 1;
            } else {
                user.streak.current = 1; // streak broken or first run
            }
            user.streak.longest = Math.max(user.streak.longest, user.streak.current);
            user.streak.lastRunDate = new Date();

            // Add today to runDates (for calendar)
            if (!user.runDates.includes(today)) {
                user.runDates.push(today);
            }

            // Add weeklyXP
            user.weeklyXP = (user.weeklyXP || 0) + xpEarned;

            // Add Lifetime stats for the Leaderboards
            user.totalDistance = (user.totalDistance || 0) + distance;
            user.totalSteps = (user.totalSteps || 0) + (steps || 0);
            user.totalLoops = (user.totalLoops || 0) + (territoriesCaptured || 0);

            // Check achievements
            const allRuns = await Run.find({ user: req.userId });
            const totalRuns = allRuns.length;
            const totalDist = allRuns.reduce((s, r) => s + r.distance, 0);
            const currentStreak = user.streak.current;
            const newAchievements = [];

            for (const [key, { check }] of Object.entries(ACHIEVEMENTS)) {
                if (!user.achievements.includes(key) && check(totalRuns, totalDist, currentStreak)) {
                    user.achievements.push(key);
                    newAchievements.push(key);
                }
            }

            await user.save();

            res.status(201).json({
                message: 'Run saved successfully',
                run,
                streak: user.streak.current,
                newAchievements,
            });
        } else {
            res.status(201).json({ message: 'Run saved successfully', run });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save run' });
    }
});

// ── GET /api/runs — Get all runs for logged-in user ──
router.get('/', async (req, res) => {
    try {
        const runs = await Run.find({ user: req.userId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ runs });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch runs' });
    }
});

// ── GET /api/runs/stats — Get user stats summary ────
router.get('/stats', async (req, res) => {
    try {
        const runs = await Run.find({ user: req.userId });

        const stats = {
            totalRuns: runs.length,
            totalDistance: runs.reduce((sum, r) => sum + r.distance, 0),
            totalDuration: runs.reduce((sum, r) => sum + r.duration, 0),
            totalSteps: runs.reduce((sum, r) => sum + r.steps, 0),
            totalCalories: runs.reduce((sum, r) => sum + r.calories, 0),
            totalXP: runs.reduce((sum, r) => sum + r.xpEarned, 0),
            totalTerritories: runs.reduce((sum, r) => sum + r.territoriesCaptured, 0),
        };

        res.json({ stats });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
