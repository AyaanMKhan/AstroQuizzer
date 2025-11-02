import axios from "axios";
import Apod from "../models/Apod.js";

/**
 * Fetches APOD from NASA API and stores/updates it in MongoDB
 * Always fetches the same date from 2024 (one year ago) for reliability
 * Deletes all previous days' APODs, keeping only the fetched one
 */
export async function fetchAndStoreApod() {
  try {
    const NASA_API_KEY = process.env.NASA_API_KEY;
    if (!NASA_API_KEY) {
      console.error("❌ Missing NASA_API_KEY in .env");
      throw new Error("NASA_API_KEY not configured");
    }

    // Get today's month and day, but always use year 2024
    const now = new Date();
    const year = 2024; // Always use 2024
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const fetchDate = `${year}-${month}-${day}`;
    
    console.log(`🌌 Fetching APOD for ${fetchDate} (same date from 2024)...`);

    // Fetch APOD from 2024 with same month/day
    const response = await axios.get('https://api.nasa.gov/planetary/apod', {
      params: {
        api_key: NASA_API_KEY,
        date: fetchDate
      }
    });

    // Delete all previous days' APODs (keep only the one we successfully fetched)
    const deleteResult = await Apod.deleteMany({ date: { $ne: fetchDate } });
    if (deleteResult.deletedCount > 0) {
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} old APOD record(s)`);
    }

    const { date, title, url, explanation, media_type } = response.data;

    // Check if this date already exists
    const existing = await Apod.findOne({ date });

    let apod;
    if (existing) {
      // Update existing record
      existing.title = title;
      existing.url = url;
      existing.explanation = explanation;
      existing.media_type = media_type;
      await existing.save();
      apod = existing.toObject();
      console.log(`✅ Updated APOD for ${date}: ${title}`);
    } else {
      // Create new record
      apod = await Apod.create({ date, title, url, explanation, media_type });
      apod = apod.toObject();
      console.log(`✅ Stored new APOD for ${date}: ${title}`);
    }

    return apod;
  } catch (err) {
    console.error("❌ APOD fetch error:", err.message);
    if (err.response) {
      console.error("❌ NASA API response:", err.response.status, err.response.data);
    }
    throw err;
  }
}

