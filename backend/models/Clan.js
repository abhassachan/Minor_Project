const mongoose = require('mongoose');

const clanSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String, // 6-character code e.g. XK92PL
            required: true,
            unique: true,
            uppercase: true,
        },
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        members: [
            { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        ],
        stats: {
            totalArea: { type: Number, default: 0 },
            totalDistance: { type: Number, default: 0 },
            totalLoops: { type: Number, default: 0 },
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Clan', clanSchema);
