const express = require('express');
const router = express.Router();
const ClanWar = require('../models/ClanWar');
const Clan = require('../models/Clan');
const User = require('../models/User');
const Run = require('../models/Run');
const Territory = require('../models/Territory');
const auth = require('../middleware/auth');

// ── SCORING CONSTANTS ──
const PTS_PER_KM = 10;
const PTS_PER_TERRITORY = 50;
const PTS_PER_PARTICIPANT = 25;

// ── Helper: calculate live scores for a war ──
async function calculateWarScores(war) {
    const start = war.startsAt;
    const end = war.endsAt < new Date() ? war.endsAt : new Date();

    async function scoreForSide(memberIds) {
        // 1. Distance: sum of all runs by these members during the war window
        const runs = await Run.find({
            user: { $in: memberIds },
            createdAt: { $gte: start, $lte: end },
        });

        let totalDistance = 0;
        const activeRunners = new Set();
        runs.forEach(run => {
            totalDistance += run.distance || 0;
            activeRunners.add(run.user.toString());
        });

        // 2. Territories captured during the war window
        //    A territory "capture" = a territory record where user gained ownership during the war
        const territories = await Territory.find({
            'counts.user': { $in: memberIds },
            'counts.lastRunAt': { $gte: start, $lte: end },
        });

        // Count unique territories where a member ran during the war
        let territoriesCaptured = 0;
        territories.forEach(zone => {
            const memberRan = zone.counts.some(c => {
                const userId = c.user._id ? c.user._id.toString() : c.user.toString();
                return memberIds.map(id => id.toString()).includes(userId) &&
                    c.lastRunAt >= start && c.lastRunAt <= end;
            });
            if (memberRan) territoriesCaptured++;
        });

        const participants = activeRunners.size;
        const total = Math.round(
            (totalDistance * PTS_PER_KM) +
            (territoriesCaptured * PTS_PER_TERRITORY) +
            (participants * PTS_PER_PARTICIPANT)
        );

        return {
            distance: Math.round(totalDistance * 100) / 100,
            territories: territoriesCaptured,
            participants,
            total,
        };
    }

    const challengerScores = await scoreForSide(war.challengerMembers);
    const defenderScores = await scoreForSide(war.defenderMembers);

    return { challenger: challengerScores, defender: defenderScores };
}

// ── Helper: check if clan has an active/pending/proposed war ──
async function clanHasActiveWar(clanId) {
    const existing = await ClanWar.findOne({
        $or: [
            { challengerClan: clanId },
            { defenderClan: clanId },
        ],
        status: { $in: ['proposed', 'pending', 'active'] },
    });
    return existing;
}

// ────────────────────────────────────────────────────────
// @route   POST /api/clanwars/propose
// @desc    Any member proposes a war against another clan (needs leader approval)
// @access  Private
router.post('/propose', auth, async (req, res) => {
    try {
        const { targetClanId } = req.body;
        if (!targetClanId) return res.status(400).json({ error: 'Target clan ID is required' });

        const user = await User.findById(req.userId);
        if (!user.clanId) return res.status(400).json({ error: 'You must be in a clan' });

        // Can't challenge your own clan
        if (user.clanId.toString() === targetClanId) {
            return res.status(400).json({ error: "You can't challenge your own clan" });
        }

        // Check target clan exists
        const targetClan = await Clan.findById(targetClanId);
        if (!targetClan) return res.status(404).json({ error: 'Target clan not found' });

        // Check neither clan has an active war
        const myActiveWar = await clanHasActiveWar(user.clanId);
        if (myActiveWar) return res.status(400).json({ error: 'Your clan already has an ongoing war' });

        const targetActiveWar = await clanHasActiveWar(targetClanId);
        if (targetActiveWar) return res.status(400).json({ error: 'Target clan already has an ongoing war' });

        // Check if proposer IS the leader — if so, skip to 'pending' directly
        const myClan = await Clan.findById(user.clanId);
        const isLeader = myClan.creator.toString() === req.userId;

        const war = new ClanWar({
            challengerClan: user.clanId,
            defenderClan: targetClanId,
            proposedBy: req.userId,
            status: isLeader ? 'pending' : 'proposed',
            duration: req.body.duration || 24,
        });

        await war.save();

        await war.populate('challengerClan', 'name code');
        await war.populate('defenderClan', 'name code');
        await war.populate('proposedBy', 'name');

        res.status(201).json({
            message: isLeader
                ? 'War challenge sent to the opposing clan!'
                : 'War proposal submitted — waiting for your clan leader to approve.',
            war,
        });
    } catch (err) {
        console.error('Propose war error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ────────────────────────────────────────────────────────
// @route   POST /api/clanwars/:warId/approve
// @desc    Clan leader approves a member's war proposal (proposed → pending)
// @access  Private (leader only)
router.post('/:warId/approve', auth, async (req, res) => {
    try {
        const war = await ClanWar.findById(req.params.warId);
        if (!war) return res.status(404).json({ error: 'War not found' });
        if (war.status !== 'proposed') return res.status(400).json({ error: 'This war is not awaiting approval' });

        // Verify user is the leader of the challenger clan
        const clan = await Clan.findById(war.challengerClan);
        if (!clan || clan.creator.toString() !== req.userId) {
            return res.status(403).json({ error: 'Only the clan leader can approve war proposals' });
        }

        // Leader can set the duration
        if (req.body.duration) {
            war.duration = Math.min(Math.max(req.body.duration, 1), 168);
        }

        war.status = 'pending';
        await war.save();

        await war.populate('challengerClan', 'name code');
        await war.populate('defenderClan', 'name code');

        res.json({ message: 'War challenge approved and sent!', war });
    } catch (err) {
        console.error('Approve war error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ────────────────────────────────────────────────────────
// @route   POST /api/clanwars/:warId/accept
// @desc    Defender clan leader accepts the war challenge (pending → active)
// @access  Private (defender leader only)
router.post('/:warId/accept', auth, async (req, res) => {
    try {
        const war = await ClanWar.findById(req.params.warId);
        if (!war) return res.status(404).json({ error: 'War not found' });
        if (war.status !== 'pending') return res.status(400).json({ error: 'This war cannot be accepted' });

        // Verify user is the leader of the defender clan
        const defenderClan = await Clan.findById(war.defenderClan);
        if (!defenderClan || defenderClan.creator.toString() !== req.userId) {
            return res.status(403).json({ error: 'Only the defending clan leader can accept' });
        }

        // Snapshot members from both clans
        const challengerClan = await Clan.findById(war.challengerClan);
        war.challengerMembers = challengerClan.members;
        war.defenderMembers = defenderClan.members;

        // Start the war
        war.status = 'active';
        war.startsAt = new Date();
        war.endsAt = new Date(Date.now() + war.duration * 60 * 60 * 1000);
        await war.save();

        await war.populate('challengerClan', 'name code');
        await war.populate('defenderClan', 'name code');

        res.json({ message: '⚔️ War has begun!', war });
    } catch (err) {
        console.error('Accept war error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ────────────────────────────────────────────────────────
// @route   POST /api/clanwars/:warId/decline
// @desc    Defender clan leader declines the challenge
// @access  Private (defender leader only)
router.post('/:warId/decline', auth, async (req, res) => {
    try {
        const war = await ClanWar.findById(req.params.warId);
        if (!war) return res.status(404).json({ error: 'War not found' });
        if (war.status !== 'pending') return res.status(400).json({ error: 'This war cannot be declined' });

        const defenderClan = await Clan.findById(war.defenderClan);
        if (!defenderClan || defenderClan.creator.toString() !== req.userId) {
            return res.status(403).json({ error: 'Only the defending clan leader can decline' });
        }

        war.status = 'declined';
        await war.save();

        res.json({ message: 'War challenge declined', war });
    } catch (err) {
        console.error('Decline war error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ────────────────────────────────────────────────────────
// @route   POST /api/clanwars/:warId/cancel
// @desc    Challenger cancels their own war (proposed or pending)
// @access  Private (challenger clan leader or proposer)
router.post('/:warId/cancel', auth, async (req, res) => {
    try {
        const war = await ClanWar.findById(req.params.warId);
        if (!war) return res.status(404).json({ error: 'War not found' });

        if (!['proposed', 'pending'].includes(war.status)) {
            return res.status(400).json({ error: 'Only proposed or pending wars can be cancelled' });
        }

        // Allow the proposer or the clan leader to cancel
        const clan = await Clan.findById(war.challengerClan);
        const isLeader = clan && clan.creator.toString() === req.userId;
        const isProposer = war.proposedBy.toString() === req.userId;

        if (!isLeader && !isProposer) {
            return res.status(403).json({ error: 'Only the proposer or clan leader can cancel' });
        }

        war.status = 'cancelled';
        await war.save();

        res.json({ message: 'War cancelled', war });
    } catch (err) {
        console.error('Cancel war error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ────────────────────────────────────────────────────────
// @route   GET /api/clanwars/active
// @desc    Get the active/pending/proposed war for the user's clan
// @access  Private
router.get('/active', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user.clanId) return res.json({ war: null });

        const war = await ClanWar.findOne({
            $or: [
                { challengerClan: user.clanId },
                { defenderClan: user.clanId },
            ],
            status: { $in: ['proposed', 'pending', 'active'] },
        })
            .populate('challengerClan', 'name code members')
            .populate('defenderClan', 'name code members')
            .populate('proposedBy', 'name');

        if (!war) return res.json({ war: null });

        // If war is active and has ended, finalize it
        if (war.status === 'active' && new Date() > war.endsAt) {
            const scores = await calculateWarScores(war);
            war.scores = scores;

            if (scores.challenger.total > scores.defender.total) {
                war.winner = war.challengerClan._id;
            } else if (scores.defender.total > scores.challenger.total) {
                war.winner = war.defenderClan._id;
            } else {
                war.winner = null; // tie
            }
            war.status = 'completed';
            await war.save();
        }

        // If active, include live scores
        if (war.status === 'active') {
            const liveScores = await calculateWarScores(war);
            return res.json({ war: { ...war.toObject(), liveScores } });
        }

        res.json({ war });
    } catch (err) {
        console.error('Get active war error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ────────────────────────────────────────────────────────
// @route   GET /api/clanwars/history
// @desc    Get past wars for the user's clan
// @access  Private
router.get('/history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user.clanId) return res.json({ wars: [] });

        const wars = await ClanWar.find({
            $or: [
                { challengerClan: user.clanId },
                { defenderClan: user.clanId },
            ],
            status: { $in: ['completed', 'declined', 'cancelled'] },
        })
            .populate('challengerClan', 'name')
            .populate('defenderClan', 'name')
            .populate('winner', 'name')
            .sort({ updatedAt: -1 })
            .limit(20);

        res.json({ wars });
    } catch (err) {
        console.error('War history error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ────────────────────────────────────────────────────────
// @route   GET /api/clanwars/:warId
// @desc    Get full details of a specific war
// @access  Private
router.get('/:warId', auth, async (req, res) => {
    try {
        const war = await ClanWar.findById(req.params.warId)
            .populate('challengerClan', 'name code')
            .populate('defenderClan', 'name code')
            .populate('proposedBy', 'name')
            .populate('winner', 'name');

        if (!war) return res.status(404).json({ error: 'War not found' });

        // If active, attach live scores
        if (war.status === 'active') {
            if (new Date() > war.endsAt) {
                // Finalize
                const scores = await calculateWarScores(war);
                war.scores = scores;
                if (scores.challenger.total > scores.defender.total) {
                    war.winner = war.challengerClan._id;
                } else if (scores.defender.total > scores.challenger.total) {
                    war.winner = war.defenderClan._id;
                } else {
                    war.winner = null;
                }
                war.status = 'completed';
                await war.save();
                await war.populate('winner', 'name');
            } else {
                const liveScores = await calculateWarScores(war);
                return res.json({ war: { ...war.toObject(), liveScores } });
            }
        }

        res.json({ war });
    } catch (err) {
        console.error('Get war error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ────────────────────────────────────────────────────────
// @route   GET /api/clanwars/search
// @desc    Search for clans to challenge
// @access  Private
router.get('/search/clans', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const q = req.query.q || '';

        const query = {
            _id: { $ne: user.clanId }, // exclude own clan
        };

        if (q.trim()) {
            query.name = { $regex: q.trim(), $options: 'i' };
        }

        const clans = await Clan.find(query)
            .select('name code members')
            .limit(15);

        const results = clans.map(c => ({
            _id: c._id,
            name: c.name,
            memberCount: c.members.length,
        }));

        res.json({ clans: results });
    } catch (err) {
        console.error('Search clans error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
