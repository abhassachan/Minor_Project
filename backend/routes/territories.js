const express = require('express');
const router = express.Router();
const Territory = require('../models/Territory');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Helper: Calculate Haversine distance between two points in meters
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
}

// Helper: Calculate centroid of a polygon (array of [lat, lng])
function polygonCentroid(points) {
    let sumLat = 0, sumLng = 0;
    points.forEach(p => {
        sumLat += p[0];
        sumLng += p[1];
    });
    return {
        lat: sumLat / points.length,
        lng: sumLng / points.length
    };
}

// @route   POST /api/territories/record
// @desc    Record a new captured loop / territory
// @access  Private
router.post('/record', auth, async (req, res) => {
    try {
        const { polygon, area } = req.body;
        
        if (!polygon || polygon.length < 3) {
            return res.status(400).json({ error: 'Valid polygon required' });
        }

        // Calculate centroid of the new loop
        const centroid = polygonCentroid(polygon);

        // Find existing territories
        const allTerritories = await Territory.find().populate('counts.user', 'name');
        
        let matchedZone = null;
        for (let zone of allTerritories) {
            const distance = haversineDistance(centroid.lat, centroid.lng, zone.centroid.lat, zone.centroid.lng);
            if (distance <= 100) { // Within 100 meters = same zone
                matchedZone = zone;
                break;
            }
        }

        if (matchedZone) {
            // Contest existing zone
            const userIndex = matchedZone.counts.findIndex(c => c.user._id && c.user._id.toString() === req.userId);
            if (userIndex !== -1) {
                matchedZone.counts[userIndex].count += 1;
                matchedZone.counts[userIndex].lastRunAt = Date.now();
            } else {
                matchedZone.counts.push({ user: req.userId, count: 1 });
            }

            // Recalculate owner (who has the max count?)
            let maxCount = 0;
            let newOwner = matchedZone.owner;
            matchedZone.counts.forEach(c => {
                if (c.count > maxCount) {
                    maxCount = c.count;
                    // c.user could be populated object or ObjectId, handle safely
                    newOwner = c.user._id ? c.user._id : c.user;
                }
            });
            matchedZone.owner = newOwner;
            await matchedZone.save();
            
            // Also update user's total area if they just became owner and weren't before
            // Note: actual area aggregation should ideally run as a separate service, but this is simple logic

            res.json({ message: 'Contested existing territory', zone: matchedZone, isNew: false });
        } else {
            // Create new zone
            const newZone = new Territory({
                centroid,
                points: polygon,
                area: area,
                counts: [{ user: req.userId, count: 1 }],
                owner: req.userId
            });
            
            await newZone.save();
            
            // Increment user's total area since they own a new territory
            await User.findByIdAndUpdate(req.userId, { $inc: { totalArea: area } });

            res.status(201).json({ message: 'Created new territory', zone: newZone, isNew: true });
        }
    } catch (err) {
        console.error('Territory record error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/territories/map
// @desc    Get all zones for the map view
// @access  Public
router.get('/map', async (req, res) => {
    try {
        const zones = await Territory.find().populate('owner', 'name profilePic clanId');
        // If we want clans, we might want to populate clanId too. But basic is fine.
        res.json(zones);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/territories/zone/:zoneId
// @desc    Get details of a specific territory
// @access  Public
router.get('/zone/:zoneId', async (req, res) => {
    try {
        const zone = await Territory.findById(req.params.zoneId)
            .populate('owner', 'name profilePic')
            .populate('counts.user', 'name profilePic');
            
        if (!zone) return res.status(404).json({ error: 'Zone not found' });
        res.json(zone);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/territories/user/:userId
// @desc    Get all zones owned by a specific user
// @access  Public
router.get('/user/:userId', async (req, res) => {
    try {
        const zones = await Territory.find({ owner: req.params.userId });
        res.json(zones);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/territories/clan/:clanId
// @desc    Get all zones owned by members of a specific clan
// @access  Public
router.get('/clan/:clanId', async (req, res) => {
    try {
        // First find all users in that clan
        const members = await User.find({ clanId: req.params.clanId }).select('_id');
        const memberIds = members.map(m => m._id);
        
        // Find territories owned by any of those users
        const zones = await Territory.find({ owner: { $in: memberIds } });
        res.json(zones);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
