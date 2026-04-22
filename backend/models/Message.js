const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        clan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Clan',
            required: true,
            index: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        text: {
            type: String,
            required: true,
            maxlength: 1000,
            trim: true,
        },
        type: {
            type: String,
            enum: ['text', 'system'], // system = "X joined the clan", etc.
            default: 'text',
        },
    },
    { timestamps: true }
);

// Index for efficient message fetching (newest first)
messageSchema.index({ clan: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
