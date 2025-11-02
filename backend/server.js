import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import { fetchAndStoreApod } from "./utils/apodFetcher.js";
import { initApodCron } from "./cron/apodCron.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_DB_STRING || process.env.mongo_db_string;
const DB_NAME = process.env.MONGO_DB_NAME || process.env.mongo_db_name || "astroquizzer";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || process.env.bcrypt_rounds || "12", 10);

// Middleware
app.use(cors({ origin: "*" })); // TODO: Tighten to specific origins in production
app.use(express.json());

// MongoDB Connection
if (!MONGO_URI) {
  console.error("❌ Missing MONGO_DB_STRING in .env");
  process.exit(1);
}

try {
  await mongoose.connect(MONGO_URI, {
    dbName: DB_NAME,
    serverSelectionTimeoutMS: 15000,
    family: 4
  });
  console.log("✅ MongoDB connected");
} catch (err) {
  console.error("❌ MongoDB connection error:", err.message);
  process.exit(1);
}

// Initialize NASA APOD cron job
initApodCron();

// ============================================================================
// API Routes
// ============================================================================

// Register
app.post("/api/register", async (req, res) => {
  try {
    let { username, password, firstName, lastName, email, favoriteSign } = req.body || {};
    
    if (!username || !password || !firstName || !lastName || !email) {
      return res.status(400).json({ error: "All fields are required" });
    }

    username = String(username).trim();
    email = String(email).trim().toLowerCase();

    const exists = await User.findOne({ $or: [{ username }, { email }] }).lean();
    if (exists) {
      return res.status(400).json({
        error: exists.username === username ? "Username already in use" : "Email already in use"
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await User.create({
      username,
      email,
      firstName,
      lastName,
      passwordHash,
      verified: false,
      quizzesTaken: 0,
      totalScore: 0,
      favoriteSign: favoriteSign || "Pisces"
    });

    return res.status(200).json({
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      error: ""
    });
  } catch (err) {
    if (err?.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0] || "field";
      return res.status(400).json({ error: `${key} already in use` });
    }
    console.error("❌ Register error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    const user = await User.findOne({ username: String(username).trim() }).select("+password");
    if (!user) {
      return res.status(400).json({ error: "Incorrect username or password" });
    }

    let isValid = false;
    if (user.passwordHash) {
      isValid = await bcrypt.compare(password, user.passwordHash);
    } else if (user.password) {
      // Legacy: Migrate plaintext password to hash
      isValid = user.password === password;
      if (isValid) {
        user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        user.password = undefined;
        await user.save();
      }
    }

    if (!isValid) {
      return res.status(400).json({ error: "Incorrect username or password" });
    }

    return res.status(200).json({
      id: user._id,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      error: ""
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// Leaderboard
app.post('/api/leaderboard', async (req, res) => {
  try {
    const { _id } = req.body || {};

    const users = await User.find({}, { username: 1, totalScore: 1 })
      .sort({ totalScore: -1 })
      .lean();

    const leaderboard = users.map((u, index) => ({
      username: u.username,
      totalScore: u.totalScore,
      rank: index + 1
    }));

    const topHundred = leaderboard.slice(0, 100);

    let responseUser = null;
    if (_id) {
      const userIndex = users.findIndex(u => u._id.toString() === _id);
      if (userIndex !== -1) {
        const u = users[userIndex];
        responseUser = {
          username: u.username,
          score: u.totalScore,
          rank: userIndex + 1
        };
      }
    }

    return res.status(200).json({
      topHundred,
      user: responseUser
    });
  } catch (err) {
    console.error("❌ Leaderboard error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// Get User Profile
app.get('/api/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }

    const user = await User.findById(id).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const users = await User.find({}, { _id: 1, totalScore: 1 })
      .sort({ totalScore: -1 })
      .lean();
    
    const userIndex = users.findIndex(u => u._id.toString() === id);
    const rank = userIndex === -1 ? null : userIndex + 1;

    return res.status(200).json({
      id: user._id,
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      totalScore: user.totalScore || 0,
      quizzesTaken: user.quizzesTaken || 0,
      favoriteSign: user.favoriteSign || 'Pisces',
      rank
    });
  } catch (err) {
    console.error('❌ User profile error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get Today's APOD
app.get('/api/apod/today', async (req, res) => {
  try {
    console.log("🌌 Endpoint called: Fetching fresh APOD...");
    const apod = await fetchAndStoreApod();
    
    return res.status(200).json({
      date: apod.date,
      title: apod.title,
      url: apod.url,
      explanation: apod.explanation,
      media_type: apod.media_type
    });
  } catch (err) {
    console.error("❌ APOD route error:", err.message);
    if (err.response) {
      return res.status(err.response.status || 500).json({
        error: 'Failed to fetch APOD from NASA API'
      });
    }
    return res.status(500).json({ error: 'Server error' });
  }
});

// Root
app.get("/", (_req, res) => {
  res.send("Backend is running successfully 🚀");
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
