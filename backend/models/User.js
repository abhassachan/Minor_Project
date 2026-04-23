const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 20,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 8,
        },
        profilePic: {
            type: String,
            default: '',
        },
        // ── Streak tracking ──
        streak: {
            current: { type: Number, default: 0 },
            longest: { type: Number, default: 0 },
            lastRunDate: { type: Date, default: null },
        },
        runDates: {
            type: [String], // ["2026-04-01", "2026-04-02", ...] for calendar
            default: [],
        },
        // ── League system ──
        league: {
            name: { type: String, default: 'Bronze' },
            joinedAt: { type: Date, default: Date.now },
        },
        weeklyXP: {
            type: Number,
            default: 0,
        },
        // ── Achievements & Challenges ──
        achievements: {
            type: [String], // ["first_run", "5k_conqueror", "10_runs", ...]
            default: [],
        },
        completedChallenges: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Challenge',
            }
        ],
        // ── Clan & Territories ──
        clanId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Clan',
            default: null,
        },
        city: {
            type: String, // Location for local leaderboards
            default: '',
        },
        // ── Lifetime Stats ──
        totalDistance: { type: Number, default: 0 },
        totalSteps: { type: Number, default: 0 },
        totalLoops: { type: Number, default: 0 },
        totalArea: { type: Number, default: 0 }, // Total controlled area
    },
    { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
