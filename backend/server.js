import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer"

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

    const u = await User.create({username, email, firstName, lastName, password, verified: false, quizzesTaken: 0, totalScore: 0, favoriteSign: favoriteSign || "Pisces"});


    const verificationToken = jwt.sign(
      { email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" }
    );

    // Email verification link (frontend route can call backend verify endpoint)
    const verifyLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    // Configure transporter (example using Gmail, but you can use SendGrid, SES, etc.)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"Astroquizzer" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your email address",
      html: `
        <h2>Welcome, ${firstName}!</h2>
        <p>Please verify your email by clicking the link below:</p>
        <a href="${verifyLink}" target="_blank">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `
    };

    //console.log("Verification link:", verifyLink);
    
    //await transporter.sendMail(mailOptions);
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent:", info.response);
    } catch (err) {
      console.error("Email sending error:", err);
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

app.get("/api/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Missing token" });


    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { email } = decoded;


    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid token" });
    if (user.verified) return res.status(200).json({ message: "Email already verified" });


    user.verified = true;
    await user.save();


    return res.status(200).json({ message: "Email successfully verified!" });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(400).json({ error: "Invalid or expired token" });
  }
});

// API Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({error: "Missing username or password"});
    }

    const user = await User.findOne({username: String(username).trim() }).select("+password");
    if (!user) return res.status(400).json({error: "Incorrect username or password"});

    if(!user.verified) return res.status(400).json({error: "Email unverified"});

    //json token stuff
    try
    {
      const token = require("./createJWT.js");
      ret = token.createToken( user.firstName, user.lastName, user._id);
    }
    catch(e)
    {
      ret = {error:e.message};
    }

    return res.status(200).json(ret);

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({error: "Server error"});
  }
});

app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "No account found with that email" });

    const resetToken = jwt.sign(
      { email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"AstroQuizzer" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password",
      html: `
        <h3>Password Reset Request</h3>
        <p>Click the link below to reset your password (valid for 15 minutes):</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
      `
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const { email } = decoded;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid token" });

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password reset successful!" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(400).json({ error: "Invalid or expired token" });
  }
});


app.post('/api/leaderboard', async (req, res) => {
  try {
    const { _id, jwtToken } = req.body || {};

    var token = require('./createJWT.js');
    try
    {
      if( token.isExpired(jwtToken))
      {
        var r = {error:'The JWT is no longer valid', jwtToken: ''};
        res.status(200).json(r);
        return;
      }
    }
    catch(e)
    {
      console.log(e.message);
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

    var refreshedToken = null;
    try
    {
      refreshedToken = token.refresh(jwtToken);
    }
    catch(e)
    {
      console.log(e.message);
    }

    res.status(200).json({
      topHundred,
      user: responseUser,
      jwtToken: refreshedToken
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// API Get User Profile (with rank)
app.get('/api/user/:id', async (req, res) => {
  try {
    const { id, jwtToken } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    var token = require('./createJWT.js');
    try
    {
      if( token.isExpired(jwtToken))
      {
        var r = {error:'The JWT is no longer valid', jwtToken: ''};
        res.status(200).json(r);
        return;
      }
    }
    catch(e)
    {
      console.log(e.message);
    }

    const user = await User.findById(id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const users = await User.find({}, { _id: 1, totalScore: 1 }).sort({ totalScore: -1 }).lean();
    const userIndex = users.findIndex(u => u._id.toString() === id);
    const rank = userIndex === -1 ? null : userIndex + 1;

    var refreshedToken = null;
    try
    {
      refreshedToken = token.refresh(jwtToken);
    }
    catch(e)
    {
      console.log(e.message);
    }

    return res.status(200).json({
      id: user._id,
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      totalScore: user.totalScore || 0,
      quizzesTaken: user.quizzesTaken || 0,
      favoriteSign: user.favoriteSign || 'Pisces',
      rank,
      jwtToken: refreshedToken
    });
  } catch (err) {
    console.error('User profile error:', err);
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