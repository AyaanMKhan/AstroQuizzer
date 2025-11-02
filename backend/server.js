import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { createToken, isExpired, refresh } from "./createJWT.js";

dotenv.config();

const app = express();
const PORT = 5001;
const MONGO_URI = process.env.mongo_db_string;
const DB_NAME = process.env.mongo_db_name || "astroquizzer";

app.use(cors({ origin: "*" }));
app.use(express.json());

// connect Mongo
if (!MONGO_URI) {
  console.error("Missing mongo_db_string in .env");
  process.exit(1);
}
try {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 15000, family: 4 });
  console.log("MongoDB connected");
} catch (err) {
  console.error("Mongo connect error:", err);
  process.exit(1);
}

// model
const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true },
  email:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  firstName:    { type: String, required: true },
  lastName:     { type: String, required: true },
  passwordHash: { type: String, required: true },
  verified:     { type: Boolean, default: false },
  quizzesTaken: { type: Number, default: 0, min: 0 },
  totalScore:   { type: Number, default: 0, min: 0 },
  favoriteSign: {
    type: String,
    default: "Pisces",
    enum: ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]
  },
  password:     { type: String, select: false }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

// Register API
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

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || process.env.bcrypt_rounds || "12", 10);
    const passwordHash = await bcrypt.hash(password, rounds);

    const u = await User.create({
      username, email, firstName, lastName, passwordHash,
      verified: false, quizzesTaken: 0, totalScore: 0, favoriteSign: favoriteSign || "Pisces"
    });

    // (handout typically doesn't auto-login here; leave token out)
    return res.status(200).json({
      id: u._id, username: u.username, firstName: u.firstName, lastName: u.lastName, error: ""
    });
  } catch (err) {
    if (err?.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0] || "field";
      return res.status(400).json({ error: `${key} already in use` });
    }
    console.error("Register error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Login API
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password", jwtToken: "" });
    }

    const user = await User.findOne({ username: String(username).trim() });
    if (!user) return res.status(200).json({ error: "Incorrect username or password", jwtToken: "" });

    let ok = false;
    if (user.passwordHash) {
      ok = await bcrypt.compare(password, user.passwordHash);
    } else if (user.password) {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
      ok = user.password === password;
      if (ok) {
        user.passwordHash = await bcrypt.hash(password, rounds);
        user.password = undefined;
        await user.save();
      }
    }
    if (!ok) return res.status(200).json({ error: "Incorrect username or password", jwtToken: "" });

    const { accessToken } = createToken({
      userId: user._id.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName
    });

    return res.status(200).json({
      id: user._id,
      username: user.username,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      jwtToken: accessToken,   // <-- return token in body (handout style)
      error: ""
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error", jwtToken: "" });
  }
});

// Leaderboard API
app.post("/api/leaderboard", async (req, res) => {
  try {
    const { _id, jwtToken } = req.body || {};
    // early expiry check
    if (!jwtToken || isExpired(jwtToken)) {
      return res.status(200).json({ error: "The JWT is no longer valid", jwtToken: "" });
    }

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
        responseUser = { username: u.username, score: u.totalScore, rank: userIndex + 1 };
      }
    }

    // refresh token before sending response
    const { accessToken } = refresh(jwtToken);

    return res.status(200).json({
      topHundred,
      user: responseUser,
      error: "",
      jwtToken: accessToken
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return res.status(500).json({ error: "Server error", jwtToken: "" });
  }
});

// User API
app.post("/api/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { jwtToken } = req.body || {};
    if (!id) return res.status(200).json({ error: "Missing id", jwtToken: "" });
    // JWT check
    if (!jwtToken || isExpired(jwtToken)) {
      return res.status(200).json({ error: "The JWT is no longer valid", jwtToken: "" });
    }

    const user = await User.findById(id).lean();
    if (!user) return res.status(200).json({ error: "User not found", jwtToken: "" });

    const users = await User.find({}, { _id: 1, totalScore: 1 }).sort({ totalScore: -1 }).lean();
    const userIndex = users.findIndex(u => u._id.toString() === id);
    const rank = userIndex === -1 ? null : userIndex + 1;

    const { accessToken } = refresh(jwtToken);

    return res.status(200).json({
      id: user._id,
      username: user.username,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email,
      totalScore: user.totalScore || 0,
      quizzesTaken: user.quizzesTaken || 0,
      favoriteSign: user.favoriteSign || "Pisces",
      rank,
      error: "",
      jwtToken: accessToken
    });
  } catch (err) {
    console.error("User profile error:", err);
    return res.status(500).json({ error: "Server error", jwtToken: "" });
  }
});

app.get("/", (_req, res) => {
  res.send("Backend is running successfully 🚀");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});