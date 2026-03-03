const express = require('express');
const Run = require('../models/Run');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes below require authentication
router.use(auth);

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

        res.status(201).json({
            message: 'Run saved successfully',
            run,
        });
    } catch (err) {
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
