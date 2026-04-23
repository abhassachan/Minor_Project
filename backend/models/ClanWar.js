const mongoose = require('mongoose');

const clanWarSchema = new mongoose.Schema(
    {
        // The clan whose member proposed the war
        challengerClan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Clan',
            required: true,
        },
        // The clan being challenged
        defenderClan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Clan',
            required: true,
        },
        // Member who proposed the war (may not be the leader)
        proposedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // War lifecycle:
        //   proposed  → member proposed, waiting for own clan leader approval
        //   pending   → leader approved, sent to defender clan, awaiting their acceptance
        //   active    → defender accepted, war is live
        //   completed → war time ended, scores finalized
        //   declined  → defender declined the challenge
        //   cancelled → challenger cancelled before acceptance
        status: {
            type: String,
            enum: ['proposed', 'pending', 'active', 'completed', 'declined', 'cancelled'],
            default: 'proposed',
        },
        // Duration in hours — chosen by the clan leader when approving
        duration: {
            type: Number,
            default: 24,
            min: 1,
            max: 168, // max 7 days
        },
        // Timestamps for the war window
        startsAt: { type: Date, default: null },
        endsAt: { type: Date, default: null },

        // Snapshot of member IDs at war start (locked in so late joiners don't affect outcome)
        challengerMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        defenderMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

        // Cached scores (updated on each /scores call and at finalization)
        scores: {
            challenger: {
                distance: { type: Number, default: 0 },   // total km by members during war
                territories: { type: Number, default: 0 }, // territories captured during war
                participants: { type: Number, default: 0 },// members who ran ≥1 time
                total: { type: Number, default: 0 },       // weighted total points
            },
            defender: {
                distance: { type: Number, default: 0 },
                territories: { type: Number, default: 0 },
                participants: { type: Number, default: 0 },
                total: { type: Number, default: 0 },
            },
        },
        // Winner — set when war completes (null = tie)
        winner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Clan',
            default: null,
        },
    },
    { timestamps: true }
);

// Index for quick lookups
clanWarSchema.index({ challengerClan: 1, status: 1 });
clanWarSchema.index({ defenderClan: 1, status: 1 });

module.exports = mongoose.model('ClanWar', clanWarSchema);
