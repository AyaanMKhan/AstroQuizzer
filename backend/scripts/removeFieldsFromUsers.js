import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";

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

    // Count users with the fields
    const usersWithFavoriteSign = await User.countDocuments({ favoriteSign: { $exists: true } });
    const usersWithLevel = await User.countDocuments({ level: { $exists: true } });
    const totalUsers = await User.countDocuments();
    
    console.log(`📊 Total users: ${totalUsers}`);
    console.log(`📊 Users with favoriteSign: ${usersWithFavoriteSign}`);
    console.log(`📊 Users with level: ${usersWithLevel}`);

    // Remove favoriteSign and level fields from all users using native MongoDB collection
    const collection = mongoose.connection.db.collection('users');
    
    console.log("\n🗑️  Removing favoriteSign and level fields from all users...");
    const result = await collection.updateMany(
      {},
      { 
        $unset: { 
          favoriteSign: "",
          level: ""
        } 
      }
    );
    console.log(`✅ Modified ${result.modifiedCount} users`);

    // Verify by fetching a sample user directly from collection
    const sampleUser = await collection.findOne({});
    const userFields = sampleUser ? Object.keys(sampleUser) : [];
    console.log("\n✅ Migration complete!");
    console.log(`📋 Sample user fields: ${userFields.join(", ")}`);
    console.log(`✅ Has favoriteSign: ${sampleUser && 'favoriteSign' in sampleUser ? 'YES' : 'NO'}`);
    console.log(`✅ Has level: ${sampleUser && 'level' in sampleUser ? 'YES' : 'NO'}`);
    
    // Final counts using aggregation
    const afterStats = await collection.aggregate([
      {
        $group: {
          _id: null,
          withFavoriteSign: { $sum: { $cond: [{ $ifNull: ["$favoriteSign", false] }, 1, 0] } },
          withLevel: { $sum: { $cond: [{ $ifNull: ["$level", false] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]).toArray();
    
    if (afterStats.length > 0) {
      console.log(`✅ Users still with favoriteSign: ${afterStats[0].withFavoriteSign}`);
      console.log(`✅ Users still with level: ${afterStats[0].withLevel}`);
    }

    // Also ensure all users have currentDaysPoints field
    console.log("\n🔧 Ensuring all users have currentDaysPoints field...");
    const usersWithoutPoints = await User.countDocuments({ 
      $or: [
        { currentDaysPoints: { $exists: false } },
        { currentDaysPoints: null }
      ]
    });
    
    if (usersWithoutPoints > 0) {
      const result = await User.updateMany(
        { 
          $or: [
            { currentDaysPoints: { $exists: false } },
            { currentDaysPoints: null }
          ]
        },
        { $set: { currentDaysPoints: 0 } }
      );
      console.log(`✅ Added currentDaysPoints to ${result.modifiedCount} users`);
    } else {
      console.log("✅ All users already have currentDaysPoints");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();

