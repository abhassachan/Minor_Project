const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        metric: {
            type: String,
            enum: ['total_distance', 'single_run_distance', 'streak', 'territories'],
            required: true,
        },
        targetValue: {
            type: Number,
            required: true,
        },
        xpReward: {
            type: Number,
            required: true,
        },
        fitCoinsReward: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        expiresAt: {
            type: Date,
            default: null, // Null means it never expires unless manually set to inactive
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Challenge', challengeSchema);
