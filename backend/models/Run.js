const mongoose = require('mongoose');

const runSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        distance: {
            type: Number,
            required: true, // in km
        },
        duration: {
            type: Number,
            required: true, // in seconds
        },
        steps: {
            type: Number,
            default: 0,
        },
        calories: {
            type: Number,
            default: 0,
        },
        pace: {
            type: Number, // min/km
            default: 0,
        },
        route: {
            type: [[Number]], // array of [lat, lng] pairs
            default: [],
        },
        territoriesCaptured: {
            type: Number,
            default: 0,
        },
        xpEarned: {
            type: Number,
            default: 0,
        },
        splits: {
            type: [mongoose.Schema.Types.Mixed], // store km splits data e.g. [{ km: 1, time: 300, pace: 5.0 }]
            default: [],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Run', runSchema);
