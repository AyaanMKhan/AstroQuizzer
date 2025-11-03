import cron from "node-cron";
import { fetchAndStoreApod } from "../utils/apodFetcher.js";
import { generateAdditionalResources, updateApodWithResources } from "../utils/generateResources.js";
import { generateQuestions, storeQuestions } from "../utils/generateQuestions.js";
import Question from "../models/Question.js";

// Initialize APOD cron job
export function initApodCron() {
  // Cron job: Daily at 01:00 UTC (runs after NASA's APOD update around midnight UTC)
  const CRON_SCHEDULE = '0 1 * * *';

  console.log(`🟢 Scheduling APOD cron job: Daily at 01:00 UTC (${CRON_SCHEDULE})`);

  cron.schedule(CRON_SCHEDULE, async () => {
    console.log("🌌 Cron triggered: Fetching daily APOD...");
    try {
      const apod = await fetchAndStoreApod();
      
      // Generate additional resources and questions after APOD is stored
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

        // Generate questions for today's APOD if they don't exist
        // storeQuestions will delete old records automatically
        try {
          const existingQuestions = await Question.findOne({ date: apod.date });
          if (!existingQuestions || !existingQuestions.questions || existingQuestions.questions.length === 0) {
            console.log("📝 Generating questions...");
            const questions = await generateQuestions(
              apod.date,
              apod.title,
              apod.explanation
            );
            await storeQuestions(apod.date, questions);
          } else {
            // Even if questions exist, ensure old records are deleted
            console.log(`ℹ️ Questions already exist for ${apod.date}, ensuring cleanup...`);
            await storeQuestions(apod.date, existingQuestions.questions);
          }
        } catch (questionErr) {
          console.error("❌ Error generating questions in APOD cron:", questionErr.message);
        }
      }
    } catch (err) {
      // Error already logged in fetchAndStoreApod or generateResources
    }
  });
}

