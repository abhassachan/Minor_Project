const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ── Middleware ────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/runs', require('./routes/runs'));
app.use('/api/profile', require('./routes/profile'));

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
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });
