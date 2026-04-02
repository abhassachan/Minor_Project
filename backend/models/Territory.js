const mongoose = require('mongoose');

const territorySchema = new mongoose.Schema(
    {
        centroid: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },
        points: {
            type: [[Number]], // Array of [lat, lng] pairs representing the polygon
            required: true,
        },
        area: {
            type: Number, // In square meters
            required: true,
        },
        counts: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                count: { type: Number, default: 1 },
                lastRunAt: { type: Date, default: Date.now }
            }
        ],
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null, // The user with the highest count
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Territory', territorySchema);
