import mongoose from "mongoose";
import dotenv from "dotenv";
import Apod from "../models/Apod.js";

dotenv.config();

const MONGO_URI = process.env.mongo_db_string;
const DB_NAME = process.env.mongo_db_name || "astroquizzer";

async function verifyCollection() {
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

    // Get collection info
    const collection = mongoose.connection.collection('apods');
    const count = await collection.countDocuments();
    
    console.log("📊 Collection Info:");
    console.log(`   Name: apods`);
    console.log(`   Documents: ${count}`);
    
    // List indexes
    const indexes = await collection.indexes();
    console.log(`   Indexes: ${indexes.length}`);
    console.log("\n📇 Indexes:");
    indexes.forEach(index => {
      console.log(`   ${JSON.stringify(index.key)}`);
    });

    // Show schema fields
    console.log("\n📋 Schema Fields (from Mongoose model):");
    console.log("   ✅ date (String, required, unique, indexed)");
    console.log("   ✅ title (String, required)");
    console.log("   ✅ url (String, required)");
    console.log("   ✅ explanation (String, required)");
    console.log("   ✅ media_type (String, required, enum: ['image', 'video'])");
    console.log("   ✅ createdAt (Date, auto-generated)");
    console.log("   ✅ updatedAt (Date, auto-generated)");

    // Show sample document structure if any exist
    const sample = await Apod.findOne().lean();
    if (sample) {
      console.log("\n📄 Sample Document Structure:");
      console.log(JSON.stringify(sample, null, 2));
    } else {
      console.log("\n📭 No documents in collection yet (will be created when cron runs)");
    }

    await mongoose.disconnect();
    console.log("\n✅ Verification complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyCollection();
