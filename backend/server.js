import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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
  password:     { type: String, select: false },
  // password reset
  resetToken:   { type: String, select: false },
  resetTokenExpiry: { type: Date, select: false }
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

    const users = await User.find({}, { username: 1, totalScore: 1 })
                            .sort({ totalScore: -1 })
                            .lean();

    const leaderboard = users.map((u, index) => ({
      username: u.username,
      totalScore: u.totalScore,
      rank: index + 1
    }));

    const topHundred = leaderboard.slice(0,100);

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

    res.status(200).json({
      topHundred,
      user: responseUser
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// API Get User Profile (with rank)
app.get('/api/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const user = await User.findById(id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const users = await User.find({}, { _id: 1, totalScore: 1 }).sort({ totalScore: -1 }).lean();
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
    console.error('User profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Forgot Password - Generate reset token
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      // Don't reveal if email exists for security
      return res.status(200).json({ message: 'If that email exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // TODO: Send email with reset link
    // For now, we'll return the token in development (remove in production)
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''); // Remove trailing slash
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;
    console.log('Reset link:', resetLink); // Remove in production

    return res.status(200).json({ 
      message: 'If that email exists, a reset link has been sent',
      // Remove this in production - only for development
      resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Reset Password - Verify token and reset password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ 
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    }).select('+resetToken +resetTokenExpiry');

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const rounds = parseInt(process.env.bcrypt_rounds || "12", 10);
    user.passwordHash = await bcrypt.hash(password, rounds);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Verify reset token (for frontend to check if token is valid)
app.get('/api/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const user = await User.findOne({ 
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    }).select('+resetToken +resetTokenExpiry');

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    return res.status(200).json({ valid: true });
  } catch (err) {
    console.error('Verify reset token error:', err);
    return res.status(500).json({ error: 'Server error' });
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