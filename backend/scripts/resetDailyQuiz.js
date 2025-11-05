import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import { resetDailyQuizForAllUsers } from "../cron/resetDailyQuiz.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_DB_STRING || process.env.mongo_db_string;
const DB_NAME = process.env.MONGO_DB_NAME || process.env.mongo_db_name || "astroquizzer";

async function main() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 15000,
      family: 4
    });
    console.log("✅ MongoDB connected");

    // Count users before
    const beforeCount = await User.countDocuments();
    const completedCount = await User.countDocuments({ dailyQuizCompleted: true });
    const usersWithPoints = await User.countDocuments({ currentDaysPoints: { $gt: 0 } });
    const avgPoints = await User.aggregate([
      { $group: { _id: null, avgPoints: { $avg: "$currentDaysPoints" } } }
    ]);
    console.log(`📊 Total users: ${beforeCount}`);
    console.log(`📊 Users with completed: ${completedCount}`);
    console.log(`📊 Users with points > 0: ${usersWithPoints}`);
    console.log(`📊 Average points: ${avgPoints[0]?.avgPoints?.toFixed(2) || 0}`);

    // Reset all users
    console.log("🔄 Resetting dailyQuizCompleted and currentDaysPoints for all users...");
    await resetDailyQuizForAllUsers();

    // Verify
    const afterCompleted = await User.countDocuments({ dailyQuizCompleted: true });
    const afterNotCompleted = await User.countDocuments({ dailyQuizCompleted: false });
    const afterPoints = await User.countDocuments({ currentDaysPoints: { $gt: 0 } });
    console.log(`✅ Reset complete!`);
    console.log(`✅ Completed: ${afterCompleted}, Not completed: ${afterNotCompleted}`);
    console.log(`✅ Users with points > 0: ${afterPoints}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();

