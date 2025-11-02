import mongoose from "mongoose";
import dotenv from "dotenv";
import Apod from "../models/Apod.js";

dotenv.config();

const MONGO_URI = process.env.mongo_db_string;
const DB_NAME = process.env.mongo_db_name || "astroquizzer";

async function initCollection() {
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
    console.log("✅ MongoDB connected");

    // Create collection by inserting and deleting a test document
    // This ensures the collection and indexes are created
    console.log("🟢 Initializing 'apods' collection...");
    
    const testDoc = await Apod.create({
      date: "1990-01-01",
      title: "Test - Will be deleted",
      url: "https://example.com/test",
      explanation: "Test document for collection initialization",
      media_type: "image"
    });
    
    await Apod.deleteOne({ _id: testDoc._id });
    console.log("✅ Collection 'apods' initialized successfully");

    // Show collection stats
    const count = await Apod.countDocuments();
    console.log(`📊 Current APOD records in database: ${count}`);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

initCollection();

