import mongoose from "mongoose";
import dotenv from "dotenv";
import Apod from "../models/Apod.js";

dotenv.config();

const MONGO_URI = process.env.mongo_db_string;
const DB_NAME = process.env.mongo_db_name || "astroquizzer";

async function checkMongoData() {
  try {
    if (!MONGO_URI) {
      console.error("❌ Missing mongo_db_string in .env");
      process.exit(1);
    }

    console.log("🟢 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, { 
      dbName: DB_NAME, 
      serverSelectionTimeoutMS: 15000, 
      family: 4
    });
    console.log("✅ MongoDB connected\n");

    // Get count
    const count = await Apod.countDocuments();
    console.log(`📊 Total APOD records: ${count}\n`);

    if (count === 0) {
      console.log("⚠️  No APOD data found in MongoDB!");
      console.log("   Make sure:");
      console.log("   1. Server is running (npm run dev)");
      console.log("   2. NASA_API_KEY is set in .env");
      console.log("   3. Cron job has run (should run on server start)");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Get today's APOD
    const today = new Date().toISOString().split('T')[0];
    const todayApod = await Apod.findOne({ date: today }).lean();
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📅 Today's Date: ${today}`);
    
    if (todayApod) {
      console.log("✅ Today's APOD found in MongoDB!");
      console.log("\n📄 Document Details:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📅 Date: ${todayApod.date}`);
      console.log(`📰 Title: ${todayApod.title}`);
      console.log(`🖼️  Media Type: ${todayApod.media_type}`);
      console.log(`🔗 URL: ${todayApod.url}`);
      console.log(`📝 Explanation length: ${todayApod.explanation.length} chars`);
      console.log(`⏰ Created: ${todayApod.createdAt}`);
      console.log(`⏰ Updated: ${todayApod.updatedAt}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // Show full explanation
      console.log("\n📖 Full Explanation:");
      console.log(todayApod.explanation);
    } else {
      console.log("⚠️  Today's APOD not found!");
      console.log("   It should be fetched automatically by the cron job.");
    }

    // Show all dates in collection
    const allApods = await Apod.find({}, { date: 1, title: 1, media_type: 1 }).lean();
    if (allApods.length > 0) {
      console.log(`\n📋 All APOD dates in collection (${allApods.length}):`);
      allApods.forEach((apod, idx) => {
        console.log(`   ${idx + 1}. ${apod.date} - ${apod.title} (${apod.media_type})`);
      });
    }

    await mongoose.disconnect();
    console.log("\n✅ Check complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkMongoData();
