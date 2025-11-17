import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Apod from "./models/Apod.js";
import Question from "./models/Question.js";
import { fetchAndStoreApod } from "./utils/apodFetcher.js";
import { initApodCron } from "./cron/apodCron.js";
import { initQuestionsCron } from "./cron/questionsCron.js";
import { initResetDailyQuizCron } from "./cron/resetDailyQuiz.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer"
import * as createJWT from './createJWT.js';

dotenv.config();

import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);


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

// Initialize data on server startup
async function initializeData() {
  try {
    console.log("🔍 Checking if APOD and questions exist...");
    
    // Get today's date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;

    // Check if APOD exists
    const existingApod = await Apod.findOne({ date });
    if (!existingApod) {
      console.log("🌌 No APOD found, fetching...");
      const apod = await fetchAndStoreApod();
      
      if (apod) {
        // Generate resources
        const { generateAdditionalResources, updateApodWithResources } = await import("./utils/generateResources.js");
        const resources = await generateAdditionalResources(apod.date, apod.title, apod.explanation);
        if (resources.length > 0) {
          await updateApodWithResources(apod.date, resources);
        }

        // Generate questions (storeQuestions will delete old records)
        const existingQuestions = await Question.findOne({ date: apod.date });
        if (!existingQuestions || !existingQuestions.questions || existingQuestions.questions.length === 0) {
          console.log("📝 No questions found, generating...");
          try {
            const { generateQuestions, storeQuestions } = await import("./utils/generateQuestions.js");
            const questions = await generateQuestions(apod.date, apod.title, apod.explanation);
            await storeQuestions(apod.date, questions);
          } catch (questionErr) {
            console.error("⚠️ Failed to generate questions (API key may be invalid or missing Gemini access):", questionErr.message);
            console.error("💡 To fix: Get a valid API key from https://makersuite.google.com/app/apikey");
          }
        } else {
          // Even if questions exist, ensure old records are deleted
          const { storeQuestions } = await import("./utils/generateQuestions.js");
          await storeQuestions(apod.date, existingQuestions.questions);
        }
      }
    } else {
      // APOD exists, check if questions exist
      const existingQuestions = await Question.findOne({ date });
      if (!existingQuestions || !existingQuestions.questions || existingQuestions.questions.length === 0) {
        console.log("📝 APOD exists but no questions found, generating...");
        try {
          const { generateQuestions, storeQuestions } = await import("./utils/generateQuestions.js");
          const questions = await generateQuestions(existingApod.date, existingApod.title, existingApod.explanation);
          await storeQuestions(existingApod.date, questions);
        } catch (questionErr) {
          console.error("⚠️ Failed to generate questions (API key may be invalid or missing Gemini access):", questionErr.message);
          console.error("💡 To fix: Get a valid API key from https://makersuite.google.com/app/apikey");
        }
      } else {
        // Even if questions exist, ensure old records are deleted
        console.log("✅ APOD and questions already exist");
        const { storeQuestions } = await import("./utils/generateQuestions.js");
        await storeQuestions(existingApod.date, existingQuestions.questions);
      }
    }
  } catch (err) {
    console.error("⚠️ Error initializing data:", err.message);
    // Don't exit - let server start anyway
  }
}

// Initialize data on startup
await initializeData();

// Initialize NASA APOD cron job
initApodCron();

// Initialize Questions cron job
initQuestionsCron();

// Initialize Daily Quiz Reset cron job
initResetDailyQuizCron();

// ============================================================================
// API Routes
// ============================================================================

// Register
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
  // for old plaintext passwords
  password:     { type: String, select: false },
  dailyQuizCompleted: {type: Boolean, default: false},
  currentDaysPoints:  {type: Number, default: 0, min: 0}
}, {timestamps: true});

//const User = mongoose.model("User", userSchema);

// API Register
app.post("/api/register", async (req, res) => {
  try {
    let { username, password, firstName, lastName, email } = req.body || {};
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

app.get("/api/verify-email", async (req, res) => {
  try {
    const { token } = req.query || req.body || {};
    if (!token) return res.status(400).json({ error: "Missing token" });

    // Prefer the configured secret for verification, but in development
    // allow decoding the token without verification so the flow still works
    // if the secret wasn't configured. WARNING: decoding without verifying
    // is insecure and must NOT be used in production.
    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
    let decoded;
    try {
      if (secret) {
        decoded = jwt.verify(String(token), secret);
      } else {
        if (process.env.NODE_ENV === 'production') {
          return res.status(500).json({ error: 'Server token secret not configured' });
        }
        console.warn('No ACCESS_TOKEN_SECRET configured — decoding token without verification (development only)');
        decoded = jwt.decode(String(token));
      }
    } catch (err) {
      console.error('Verify token error:', err?.message || err);
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const { email } = decoded || {};
    if (!email) return res.status(400).json({ error: 'Invalid token payload' });

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

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select("+password");
    if (!user) {
      return res.status(400).json({ error: "Incorrect email or password" });
    }
    //user = await User.findOne({username: String(username).trim() }).select("+password");
    //if (!user) return res.status(400).json({error: "Incorrect username or password"});

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
      return res.status(400).json({ error: "Incorrect email or password" });
    }
    if(!user.verified) return res.status(400).json({error: "Email unverified"});

    //json token stuff
    try
    {
      //const token = require("./createJWT.js");
      const ret = createJWT.createToken(user.firstName, user.lastName, user._id);
      //console.log("✅ LOGIN RESPONSE OBJECT:", ret);
      return res.status(200).json({
        token: ret.accessToken,      
        id: user._id,                
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      });
      //return res.status(200).json(ret);
      //ret = token.createToken( user.firstName, user.lastName, user._id);
    }
    catch(e)
    {
      console.error("💥 ERROR IN TOKEN CREATION:", e);
      return res.status(500).json({ error: e.message });
    }
    // Return an object with the user's id and basic profile information so
    // clients (web and mobile) can parse the JSON consistently.
    /*
    return res.status(200).json({
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName
    });
    */
    //return res.status(200).json(ret);

  } catch (err) {
    console.error("❌ Login error:", err.message);
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
    const { _id, jwtToken } = req.body || {};

    const token = createJWT;
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
      _id: u._id.toString(),
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
      topHundred,
      user: responseUser,
      jwtToken: refreshedToken
    });
  } catch (err) {
    console.error("❌ Leaderboard error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// Get User Profile
app.get('/api/user/:id', async (req, res) => {
  try {
    //const { id, jwtToken } = req.params;
    const { id } = req.params;
    const { jwtToken } = req.query;

    if (!id) return res.status(400).json({ error: 'Missing id' });

    const token = createJWT;
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
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const users = await User.find({}, { _id: 1, totalScore: 1 })
      .sort({ totalScore: -1 })
      .lean();
    
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
      currentDaysPoints: user.currentDaysPoints || 0,
      dailyQuizCompleted: user.dailyQuizCompleted || false,
      rank,
      jwtToken: refreshedToken
    });
  } catch (err) {
    console.error('❌ User profile error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update Username
app.put('/api/user/:id/username', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: 'Missing user id' });
    }
    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const trimmed = username.trim();
    const existing = await User.findOne({ username: trimmed }).lean();
    if (existing && existing._id.toString() !== id) {
      return res.status(400).json({ error: 'Username already in use' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.username = trimmed;
    await user.save();

    return res.status(200).json({ success: true, username: user.username });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ error: 'Username already in use' });
    }
    console.error('❌ Username update error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get Today's Quiz Questions
app.get('/api/questions/today', async (req, res) => {
  try {
    const { jwtToken } = req.query;
    const token = createJWT;

    // JWT token is optional for viewing questions - we only use it for token refresh if provided
    let validToken = false;
    try {
      if (jwtToken && !token.isExpired(jwtToken)) {
        validToken = true;
      }
    } catch (e) {
      console.log('JWT check error (non-fatal):', e.message);
    }

    // Fetch the single question document (there will only be one at a time)
    const questionDoc = await Question.findOne().lean();
    
    if (!questionDoc || !questionDoc.questions || questionDoc.questions.length === 0) {
      return res.status(404).json({ 
        error: 'Questions not available',
      });
    }

    // Return questions without correctAnswer (for security during quiz)
    const questionsForClient = questionDoc.questions.map(q => ({
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      points: q.points
    }));

    var refreshedToken = null;
    if (validToken) {
      try {
        refreshedToken = token.refresh(jwtToken);
      } catch(e) {
        console.log('Token refresh error:', e.message);
      }
    }

    return res.status(200).json({
      date: questionDoc.date,
      questions: questionsForClient,
      jwtToken: refreshedToken
    });
  } catch (err) {
    console.error("❌ Questions route error:", err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Submit Quiz Answers
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { userId, answers, jwtToken } = req.body || {};

    const token = createJWT;
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
    
    if (!userId || !answers || !Array.isArray(answers) || answers.length !== 5) {
      return res.status(400).json({ error: 'Missing userId or invalid answers array (must be 5 answers)' });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already completed
    if (user.dailyQuizCompleted) {
      return res.status(400).json({ 
        error: 'Quiz already completed for today',
        currentDaysPoints: user.currentDaysPoints,
        totalScore: user.totalScore
      });
    }

    // Get the single question document (there will only be one at a time)
    const questionDoc = await Question.findOne().lean();
    if (!questionDoc || !questionDoc.questions || questionDoc.questions.length !== 5) {
      return res.status(404).json({ error: 'Questions not available' });
    }

    // Calculate score
    let score = 0;
    const results = [];
    
    for (let i = 0; i < 5; i++) {
      const question = questionDoc.questions[i];
      const userAnswer = answers[i];
      const isCorrect = userAnswer === question.correctAnswer;
      
      if (isCorrect) {
        score += question.points;
      }
      
      results.push({
        questionIndex: i,
        isCorrect,
        points: isCorrect ? question.points : 0,
        correctAnswer: question.correctAnswer,
        userAnswer: userAnswer
      });
    }

    // Update user
    user.currentDaysPoints = score;
    user.totalScore = (user.totalScore || 0) + score;
    user.dailyQuizCompleted = true;
    user.quizzesTaken = (user.quizzesTaken || 0) + 1;
    await user.save();

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
      success: true,
      score,
      totalScore: user.totalScore,
      currentDaysPoints: user.currentDaysPoints,
      results,
      message: 'Quiz submitted successfully',
      jwtToken: refreshedToken
    });
  } catch (err) {
    console.error('❌ Quiz submission error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get Today's APOD
app.get('/api/apod/today', async (_req, res) => {
  try {
    // 1) Try to serve what's already in the DB – no date checks, just latest
    let apodDoc = await Apod.findOne({}, null, { sort: { date: -1 } }).lean();

    // 2) If nothing exists in DB, fall back to fetch-and-store once
    if (!apodDoc) {
      console.log("🌌 No APOD in DB. Fetching one-time to seed...");
      const fetched = await fetchAndStoreApod();
      apodDoc = fetched ? await Apod.findOne({ date: fetched.date }).lean() : null;
    }

    if (!apodDoc) {
      return res.status(404).json({ error: 'APOD not available' });
    }

    // 3) Ensure resources exist, but do not block response if generation fails
    if (!apodDoc.additionalResources || apodDoc.additionalResources.length === 0) {
      try {
        const { generateAdditionalResources, updateApodWithResources } = await import("./utils/generateResources.js");
        const resources = await generateAdditionalResources(apodDoc.date, apodDoc.title, apodDoc.explanation);
        if (resources.length > 0) {
          await updateApodWithResources(apodDoc.date, resources);
          const updated = await Apod.findOne({ date: apodDoc.date }).lean();
          apodDoc.additionalResources = updated?.additionalResources || [];
        }
      } catch (e) {
        console.warn("⚠️ Resource generation skipped:", e.message);
      }
    }

    return res.status(200).json({
      date: apodDoc.date,
      title: apodDoc.title,
      url: apodDoc.url,
      explanation: apodDoc.explanation,
      media_type: apodDoc.media_type,
      additionalResources: apodDoc.additionalResources || []
    });
  } catch (err) {
    console.error("❌ APOD route error:", err.message);
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
    if (createJWT && createJWT.isExpired && createJWT.isExpired(jwtToken)) 
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
  const currentId = payload?.id;
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

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
