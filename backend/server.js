const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ── Middleware ────────────────────────────────────────
app.use(cors({
    origin: [
        'http://localhost:5173',             // Vite local dev
        'http://localhost:3000',             // alt local dev
        process.env.FRONTEND_URL             // production Vercel URL
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json());

// ── Routes ───────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/runs', require('./routes/runs'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/streak', require('./routes/streak'));
app.use('/api/territories', require('./routes/territories'));
app.use('/api/clans', require('./routes/clans'));
app.use('/api/clanwars', require('./routes/clanwars'));
app.use('/api/challenges', require('./routes/challenges'));

// ── Health check ─────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ status: 'Territory Run API is running 🏃' });
});

// ── Connect to MongoDB & Start Server ────────────────
const PORT = process.env.PORT || 5000;

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });
