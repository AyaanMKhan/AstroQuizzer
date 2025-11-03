import cron from "node-cron";
import User from "../models/User.js";

/**
 * Resets all users' dailyQuizCompleted flag to false and currentDaysPoints to 0
 * Runs at 01:00 UTC when new APOD/questions are available
 */
export async function resetDailyQuizForAllUsers() {
  try {
    const result = await User.updateMany(
      {},
      { 
        $set: { 
          dailyQuizCompleted: false,
          currentDaysPoints: 0
        } 
      }
    );
    console.log(`🔄 Reset dailyQuizCompleted and currentDaysPoints for ${result.modifiedCount} users`);
  } catch (err) {
    console.error("❌ Error resetting daily quiz status:", err.message);
    throw err;
  }
}

/**
 * Initializes the daily quiz reset cron job
 * Runs at 01:00 UTC (same time as APOD cron)
 */
export function initResetDailyQuizCron() {
  // Cron job: Daily at 01:00 UTC (same time as APOD cron)
  const CRON_SCHEDULE = '0 1 * * *';

  console.log(`🟢 Scheduling Daily Quiz Reset cron job: Daily at 01:00 UTC (${CRON_SCHEDULE})`);

  cron.schedule(CRON_SCHEDULE, async () => {
    console.log("🔄 Cron triggered: Resetting daily quiz status and points for all users...");
    try {
      await resetDailyQuizForAllUsers();
    } catch (err) {
      // Error already logged in resetDailyQuizForAllUsers
    }
  });
}

