import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
const PORT = 5001;
const MONGO_URI = process.env.mongo_db_string;
const DB_NAME = process.env.mongo_db_name || "astroquizzer";

app.use(cors({origin: "*"})); // tighten later: ["https://astroquizzer.xyz"]
app.use(express.json());

// connect Mongo
if (!MONGO_URI) {
  console.error("Missing mongo_db_string in .env");
  process.exit(1);
}
try {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 15000, family: 4});
  console.log("MongoDB connected");
} catch (err) {
  console.error("Mongo connect error:", err);
  process.exit(1);
}

// model
const userSchema = new mongoose.Schema({
  username:     {type: String, required: true, unique: true, trim: true },
  email:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  firstName:    { type: String, required: true },
  lastName:     { type: String, required: true },
  passwordHash: { type: String, required: true },
  //default fields
  verified:     { type: Boolean, default: false },
  quizzesTaken: { type: Number, default: 0, min: 0 },
  totalScore:   { type: Number, default: 0, min: 0 },
  favoriteSign: {
    type: String,
    default: "Pisces",
    //locks to known signs
    enum: [
      "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
      "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
    ]
  },
  // for old plaintext passwords
  password:     { type: String, select: false }
}, {timestamps: true});

const User = mongoose.model("User", userSchema);

// API Register
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

    const rounds = parseInt(process.env.bcrypt_rounds || "12", 10);
    const passwordHash = await bcrypt.hash(password, rounds);

    const u = await User.create({username, email, firstName, lastName, passwordHash, verified: false, quizzesTaken: 0, totalScore: 0, favoriteSign: favoriteSign || "Pisces"});

    return res.status(200).json({
      id: u._id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      error: ""
    });
  } catch (err) {
    if (err?.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0] || "field";
      return res.status(400).json({error: `${key} already in use`});
    }
    console.error("Register error:", err);
    return res.status(500).json({error: "Server error"});
  }
});

// API Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({error: "Missing username or password"});
    }

    // only need for plaintext passwords
    const user = await User.findOne({username: String(username).trim() }).select("+password");
    if (!user) return res.status(400).json({error: "Incorrect username or password"});

    let ok = false;
    if (user.passwordHash) {
      ok = await bcrypt.compare(password, user.passwordHash);
    } else if (user.password) {
      // plaintext into password hash
      ok = user.password === password;
      if (ok) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
        user.passwordHash = await bcrypt.hash(password, rounds);
        user.password = undefined;
        await user.save();
      }
    }

    if (!ok) return res.status(400).json({error: "Incorrect username or password"});

    return res.status(200).json({
      id: user._id,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      error: ""
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({error: "Server error"});
  }
});

app.post('/api/leaderboard', async (req, res) => {
  try {
    const { _id } = req.body || {};
    if (!_id) {
      return res.status(400).json({ error: "Missing id" });
    }

    const users = await User.find({}, { username: 1, totalScore: 1 })
                            .sort({ totalScore: -1 })
                            .lean();

    const leaderboard = users.map((u, index) => ({
      username: u.username,
      totalScore: u.totalScore,
      rank: index + 1
    }));

    const topHundred = leaderboard.slice(0,100);

    const userIndex = users.findIndex(u => u._id.toString() === _id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[userIndex];

    res.status(200).json({
      topHundred,
      user: {
        username: user.username,
        score: user.totalScore,
        rank: userIndex + 1
      }
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// Root
app.get("/", (_req, res) => {
  res.send("Backend is running successfully 🚀");
});

// Start
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});