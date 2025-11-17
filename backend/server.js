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

    const user = await User.create({
      username,
      email,
      firstName,
      lastName,
      passwordHash,
      verified: false,
      quizzesTaken: 0,
      totalScore: 0,
      dailyQuizCompleted: false,
      currentDaysPoints: 0,
    });

    // Create email verification token and send verification email (best-effort)
    try {
      const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
      if (secret) {
        const verificationToken = jwt.sign({ email }, secret, { expiresIn: '1d' });
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5001').replace(/\/$/, ''); // Remove trailing slash
        const verifyLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

        // Configure transporter if credentials are provided
        if (process.env.RESEND_API_KEY) {
          //const { Resend } = require('resend'); // or import { Resend } from 'resend' if using ESM
          //const resend = new Resend(process.env.RESEND_API_KEY);

          await resend.emails.send({
            from: 'AstroQuizzer <noreply@astroquizzer.xyz>',
            to: email,
            subject: 'Verify your AstroQuizzer email',
            html: `
              <p>Hi ${firstName},</p>
              <p>Thanks for creating an AstroQuizzer account. Please verify your email by clicking the link below:</p>
              <p><a href="${verifyLink}">Verify email</a></p>
              <p>This link expires in 24 hours.</p>
            `,
          });

          console.log(`✅ Verification email sent via Resend to ${email}`);
        } else {
          console.warn('RESEND_API_KEY not set — skipping verification email send');
        }
      } else {
        console.warn('No ACCESS_TOKEN_SECRET/JWT_SECRET configured — skipping verification token generation');
      }
    } catch (emailErr) {
      console.error('Error while attempting to send verification email:', emailErr.message || emailErr);
    }

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
    // Accept either `email` or `username` from clients
    const { username, email, password } = req.body || {};
    const identifier = (email || username || "").trim();
    if (!identifier || !password) {
      return res.status(400).json({ error: "Missing username/email or password" });
    }

    // Lookup user by email if identifier looks like an email, otherwise try username first then email
    let user = null;
    const normalized = identifier.toLowerCase();
    if (identifier.includes("@")) {
      user = await User.findOne({ email: normalized }).select("+password");
    } else {
      user = await User.findOne({ $or: [{ username: identifier }, { email: normalized }] }).select("+password");
    }

    if (!user) return res.status(400).json({ error: "Incorrect username or password" });

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

    if (!ok) return res.status(400).json({ error: "Incorrect username or password" });

    return res.status(200).json({
      id: user._id,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      error: ""
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "No account found with that email" });

    // Create a short-lived reset token
    const resetToken = jwt.sign(
      { email },
      process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5001").replace(/\/$/, ''); // Remove trailing slash
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — skipping password reset email send");
      return res.status(500).json({ error: "Email service not configured" });
    }

    // Send email via Resend
    await resend.emails.send({
      from: "AstroQuizzer <noreply@astroquizzer.xyz>",
      to: email,
      subject: "Reset Your Password",
      html: `
        <h3>Password Reset Request</h3>
        <p>Click the link below to reset your password (valid for 15 minutes):</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
      `,
    });

    console.log(`✅ Password reset email sent via Resend to ${email}`);
    return res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET);
    const { email } = decoded;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid token" });

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.passwordHash = passwordHash;
    // Clear any old plaintext password
    user.password = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful!" });
  } catch (err) {
    console.error("Reset password error:", err);
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: "Token has expired. Please request a new reset link." });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: "Invalid token" });
    }
    res.status(400).json({ error: "Invalid or expired token" });
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

// Delete User
app.post('/api/deleteUser', async (req, res) => {
  const {id, jwtToken} = req.body || {};
  // id check
  if(!id)
  {
    return res.status(200).json({error: 'Missing id', jwtToken: ''});
  }
  // Missing jwt token check
  if (!jwtToken) 
  {
    return res.status(200).json({ error: 'Missing JWT', jwtToken: '' });
  }

  // Token check
  try
  {
    if(isExpired(jwtToken)) 
    {
      var r = {error:'The JWT is no longer valid', jwtToken: ''};
      res.status(200).json(r);
      return;
    }
  }
  catch (e)
  {
    console.log(e.message);
    var r = {error:'The JWT is no longer valid', jwtToken: ''};
    res.status(200).json(r);
    return;
  }

  // Identifies user who requested deletion
  const payload = jwt.decode(jwtToken);
  const currentId = payload?.userId;
  // Makes sure user exists and is the correct user requesting deletion
  if (!currentId || String(currentId) !== String(id)) 
  {
    return res.status(200).json({error: 'Not authorized to delete this user', jwtToken: ''});
  }

  // Makes sure it is valid MongoDB ObjectId string
  if (!mongoose.Types.ObjectId.isValid(id)) 
  {
    return res.status(200).json({ error: 'Invalid user id', jwtToken: '' });
  }

  // Deletes user
  try 
  {
    await User.deleteOne({_id: new mongoose.Types.ObjectId(id)});
  } 
  catch (err) 
  {
    console.log(err);
    return res.status(200).json({error: 'Server error', jwtToken: ''});
  }

  // Logs out by returning empty token
  return res.status(200).json({error: '', jwtToken: ''});
});


// Root
app.get("/", (_req, res) => {
  res.send("Backend is running successfully 🚀");
});

// Start
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});