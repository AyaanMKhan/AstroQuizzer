import cron from "node-cron";
import { fetchAndStoreApod } from "../utils/apodFetcher.js";
import { generateAdditionalResources, updateApodWithResources } from "../utils/generateResources.js";

// Initialize APOD cron job
export function initApodCron() {
  // Cron job: Daily at 01:00 UTC (runs after NASA's APOD update around midnight UTC)
  const CRON_SCHEDULE = '0 1 * * *';

  console.log(`🟢 Scheduling APOD cron job: Daily at 01:00 UTC (${CRON_SCHEDULE})`);

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
}

