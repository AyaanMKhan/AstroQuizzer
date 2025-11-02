import cron from "node-cron";
import { fetchAndStoreApod } from "../utils/apodFetcher.js";
import { generateAdditionalResources, updateApodWithResources } from "../utils/generateResources.js";

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
      const apod = await fetchAndStoreApod();
      
      // Generate additional resources after APOD is stored
      if (apod) {
        console.log("🔍 Generating additional resources...");
        const resources = await generateAdditionalResources(
          apod.date,
          apod.title,
          apod.explanation
        );
        
        if (resources.length > 0) {
          await updateApodWithResources(apod.date, resources);
        }
      }
    } catch (err) {
      // Error already logged in fetchAndStoreApod or generateResources
    }
  });

  // Fetch immediately on server start
  fetchAndStoreApod()
    .then(async (apod) => {
      if (apod) {
        console.log("🔍 Generating additional resources...");
        const resources = await generateAdditionalResources(
          apod.date,
          apod.title,
          apod.explanation
        );
        
        if (resources.length > 0) {
          await updateApodWithResources(apod.date, resources);
        }
      }
    })
    .catch(err => {
      // Error already logged in fetchAndStoreApod
    });
}

