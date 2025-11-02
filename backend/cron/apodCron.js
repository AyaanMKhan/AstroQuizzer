import axios from "axios";
import cron from "node-cron";
import Apod from "../models/Apod.js";

// NASA APOD Fetch Function
async function fetchAndStoreApod() {
  try {
    const NASA_API_KEY = process.env.NASA_API_KEY;
    if (!NASA_API_KEY) {
      console.error("❌ Missing NASA_API_KEY in .env");
      return;
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    console.log(`🌌 Fetching APOD for ${today}...`);

    // Delete all previous days' APODs (keep only today's)
    const deleteResult = await Apod.deleteMany({ date: { $ne: today } });
    if (deleteResult.deletedCount > 0) {
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} old APOD record(s)`);
    }

    const response = await axios.get('https://api.nasa.gov/planetary/apod', {
      params: {
        api_key: NASA_API_KEY,
        date: today
      }
    });

    const { date, title, url, explanation, media_type } = response.data;

    // Check if today's date already exists
    const existing = await Apod.findOne({ date });

    if (existing) {
      // Replace existing with new data
      existing.title = title;
      existing.url = url;
      existing.explanation = explanation;
      existing.media_type = media_type;
      await existing.save();
      console.log(`✅ Updated APOD for ${date}: ${title}`);
    } else {
      // Insert new record
      await Apod.create({ date, title, url, explanation, media_type });
      console.log(`✅ Stored new APOD for ${date}: ${title}`);
    }
  } catch (err) {
    console.error("❌ APOD fetch error:", err.message);
    if (err.response) {
      console.error("❌ NASA API response:", err.response.status, err.response.data);
    }
  }
}

// Initialize APOD cron job
export function initApodCron() {
  // Cron job: Daily at 01:00 UTC (for testing, use */1 * * * * to run every minute)
  // Production: '0 1 * * *' - Daily at 01:00 UTC
  // Testing: '*/1 * * * *' - Every minute
  const CRON_SCHEDULE = process.env.NODE_ENV === 'production' ? '0 1 * * *' : '*/1 * * * *';

  console.log(`🟢 Scheduling APOD cron job: ${CRON_SCHEDULE} (${process.env.NODE_ENV === 'production' ? 'Production: Daily at 01:00 UTC' : 'Testing: Every minute'})`);

  cron.schedule(CRON_SCHEDULE, () => {
    console.log("🌌 Cron triggered: Fetching daily APOD...");
    fetchAndStoreApod();
  });

  // Fetch immediately on server start
  fetchAndStoreApod();
}

