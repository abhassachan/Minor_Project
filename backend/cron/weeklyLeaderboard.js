const cron = require('node-cron');
const User = require('../models/User');

const LEAGUES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Conqueror'];

// Run every Sunday at 23:59 (11:59 PM)
// '59 23 * * 0' -> 59th minute, 23rd hour, any day of month, any month, 0 = Sunday
cron.schedule('59 23 * * 0', async () => {
    console.log('🏁 Running weekly leaderboard reset, promotions, and FitCoins distribution...');
    try {
        // Process each league
        for (let i = 0; i < LEAGUES.length; i++) {
            const currentLeagueName = LEAGUES[i];
            
            // Get all users in this league, sorted by weeklyXP
            const usersInLeague = await User.find({ 'league.name': currentLeagueName })
                .sort({ weeklyXP: -1 });

            if (usersInLeague.length === 0) continue;

            // Conqueror #1 gets the prize
            if (currentLeagueName === 'Conqueror') {
                const topConqueror = usersInLeague[0];
                if (topConqueror.weeklyXP > 0) {
                    console.log(`🏆 Conqueror Champion: ${topConqueror.username} with ${topConqueror.weeklyXP} XP. Awarding 500 FitCoins.`);
                    topConqueror.fitCoins = (topConqueror.fitCoins || 0) + 500;
                    await topConqueror.save();
                }
            } else if (currentLeagueName === 'Bronze' && i === 0 && !usersInLeague.some(u => u.league.name === 'Conqueror')) {
                 // Fallback: If no one is in Conqueror yet (app just launched), give it to the overall top Bronze player
                 const topPlayer = usersInLeague[0];
                 if (topPlayer.weeklyXP > 0) {
                     console.log(`🏆 Top Runner: ${topPlayer.username} with ${topPlayer.weeklyXP} XP. Awarding 500 FitCoins.`);
                     topPlayer.fitCoins = (topPlayer.fitCoins || 0) + 500;
                     await topPlayer.save();
                 }
            }

            // Apply promotions and demotions
            for (let rank = 0; rank < usersInLeague.length; rank++) {
                const user = usersInLeague[rank];
                let moved = false;

                // Top 5 promote (if not in Conqueror)
                if (rank < 5 && i < LEAGUES.length - 1) {
                    user.league.name = LEAGUES[i + 1];
                    user.league.joinedAt = new Date();
                    moved = true;
                    console.log(`📈 Promoted ${user.username} to ${LEAGUES[i + 1]}`);
                } 
                // Rank 16+ demote (if not in Bronze)
                else if (rank >= 15 && i > 0) {
                    user.league.name = LEAGUES[i - 1];
                    user.league.joinedAt = new Date();
                    moved = true;
                    console.log(`📉 Demoted ${user.username} to ${LEAGUES[i - 1]}`);
                }

                if (moved) {
                    await user.save();
                }
            }
        }

        // Reset weeklyXP to 0 for everyone
        const result = await User.updateMany({}, { $set: { weeklyXP: 0 } });
        console.log(`🔄 Reset weeklyXP to 0 for ${result.modifiedCount} users.`);
    } catch (err) {
        console.error('❌ Error in weekly leaderboard cron job:', err);
    }
});

module.exports = cron;
