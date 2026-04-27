const cron = require('node-cron');
const User = require('../models/User');

// Run every Sunday at 23:59 (11:59 PM)
// '59 23 * * 0' -> 59th minute, 23rd hour, any day of month, any month, 0 = Sunday
cron.schedule('59 23 * * 0', async () => {
    console.log('🏁 Running weekly leaderboard reset and FitCoins distribution...');
    try {
        // 1. Find the top user overall based on weeklyXP
        const topUser = await User.findOne().sort({ weeklyXP: -1 });

        if (topUser && topUser.weeklyXP > 0) {
            console.log(`🏆 Weekly winner: ${topUser.username} with ${topUser.weeklyXP} XP. Awarding 500 FitCoins.`);
            topUser.fitCoins = (topUser.fitCoins || 0) + 500;
            await topUser.save();
        } else {
            console.log('No eligible winner found for the week.');
        }

        // 2. Reset weeklyXP to 0 for everyone
        const result = await User.updateMany({}, { $set: { weeklyXP: 0 } });
        console.log(`🔄 Reset weeklyXP to 0 for ${result.modifiedCount} users.`);
    } catch (err) {
        console.error('❌ Error in weekly leaderboard cron job:', err);
    }
});

module.exports = cron;
