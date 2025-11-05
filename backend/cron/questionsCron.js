import cron from "node-cron";
import Apod from "../models/Apod.js";
import Question from "../models/Question.js";
import { generateQuestions, storeQuestions } from "../utils/generateQuestions.js";

/**
 * Generates questions for today's APOD
 * Should be called after APOD is fetched
 */
export async function generateQuestionsForToday() {
  try {
    // Get today's date
    const now = new Date();
    const year = 2024; // Match APOD fetch logic
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;

    // Check if APOD exists for today
    const apod = await Apod.findOne({ date });
    if (!apod) {
      console.log(`⚠️ No APOD found for ${date}, skipping question generation`);
      return;
    }

    // Check if questions already exist
    const existingQuestions = await Question.findOne({ date });
    if (existingQuestions && existingQuestions.questions && existingQuestions.questions.length > 0) {
      // Even if questions exist, ensure old records are deleted
      console.log(`ℹ️ Questions already exist for ${date}, ensuring cleanup...`);
      await storeQuestions(apod.date, existingQuestions.questions);
      return;
    }

    // Generate questions
    console.log(`📝 Generating questions for APOD: ${apod.title}...`);
    const questions = await generateQuestions(
      apod.date,
      apod.title,
      apod.explanation
    );

    // Store questions (will delete old records)
    await storeQuestions(apod.date, questions);
    console.log(`✅ Successfully generated and stored questions for ${date}`);

  } catch (err) {
    console.error("❌ Error generating questions:", err.message);
    throw err;
  }
}

/**
 * Initializes the questions cron job
 * Runs daily at 01:00 UTC (same time as APOD cron)
 */
export function initQuestionsCron() {
  // Cron job: Daily at 01:00 UTC (same time as APOD cron)
  const CRON_SCHEDULE = '0 1 * * *';

  console.log(`🟢 Scheduling Questions cron job: Daily at 01:00 UTC (${CRON_SCHEDULE})`);

  cron.schedule(CRON_SCHEDULE, async () => {
    console.log("📝 Cron triggered: Generating daily questions...");
    try {
      await generateQuestionsForToday();
    } catch (err) {
      // Error already logged in generateQuestionsForToday
    }
  });
}

