import cron from "node-cron";
import { fetchAndStoreApod } from "../utils/apodFetcher.js";

// Initialize APOD cron job
export function initApodCron() {
  // Cron job: Daily at 01:00 UTC (for testing, use */1 * * * * to run every minute)
  // Production: '0 1 * * *' - Daily at 01:00 UTC
  // Testing: '*/1 * * * *' - Every minute
  const CRON_SCHEDULE = process.env.NODE_ENV === 'production' ? '0 1 * * *' : '*/1 * * * *';

  console.log(`🟢 Scheduling APOD cron job: ${CRON_SCHEDULE} (${process.env.NODE_ENV === 'production' ? 'Production: Daily at 01:00 UTC' : 'Testing: Every minute'})`);

  cron.schedule(CRON_SCHEDULE, async () => {
    console.log("🌌 Cron triggered: Fetching daily APOD...");
    try {
      await fetchAndStoreApod();
    } catch (err) {
      // Error already logged in fetchAndStoreApod
    }
  });

  // Fetch immediately on server start
  fetchAndStoreApod().catch(err => {
    // Error already logged in fetchAndStoreApod
  });
}

