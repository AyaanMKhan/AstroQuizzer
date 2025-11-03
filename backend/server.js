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

// Initialize data on server startup
async function initializeData() {
  try {
    console.log("🔍 Checking if APOD and questions exist...");
    
    // Get today's date
    const now = new Date();
    const year = 2024;
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
      currentDaysPoints: 0
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
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select("+password");
    if (!user) {
      return res.status(400).json({ error: "Incorrect email or password" });
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
      return res.status(400).json({ error: "Incorrect email or password" });
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
      currentDaysPoints: user.currentDaysPoints || 0,
      dailyQuizCompleted: user.dailyQuizCompleted || false,
      rank
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
    // Get today's date (matching APOD logic)
    const now = new Date();
    const year = 2024; // Match APOD fetch logic
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;

    const questionDoc = await Question.findOne({ date }).lean();
    
    if (!questionDoc || !questionDoc.questions || questionDoc.questions.length === 0) {
      return res.status(404).json({ 
        error: 'Questions not available for today',
        date 
      });
    }

    // Return questions without correctAnswer (for security during quiz)
    const questionsForClient = questionDoc.questions.map(q => ({
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      points: q.points
    }));

    return res.status(200).json({
      date: questionDoc.date,
      questions: questionsForClient
    });
  } catch (err) {
    console.error("❌ Questions route error:", err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Submit Quiz Answers
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { userId, answers } = req.body || {};
    
    if (!userId || !answers || !Array.isArray(answers) || answers.length !== 5) {
      return res.status(400).json({ error: 'Missing userId or invalid answers array (must be 5 answers)' });
    }

    // Get today's date
    const now = new Date();
    const year = 2024;
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;

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

    // Get today's questions
    const questionDoc = await Question.findOne({ date }).lean();
    if (!questionDoc || !questionDoc.questions || questionDoc.questions.length !== 5) {
      return res.status(404).json({ error: 'Questions not available for today' });
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

    return res.status(200).json({
      success: true,
      score,
      totalScore: user.totalScore,
      currentDaysPoints: user.currentDaysPoints,
      results,
      message: 'Quiz submitted successfully'
    });
  } catch (err) {
    console.error('❌ Quiz submission error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get Today's APOD
app.get('/api/apod/today', async (req, res) => {
  try {
    console.log("🌌 Endpoint called: Fetching fresh APOD...");
    const apod = await fetchAndStoreApod();
    
    // If resources aren't populated yet, generate them
    if (!apod.additionalResources || apod.additionalResources.length === 0) {
      const { generateAdditionalResources, updateApodWithResources } = await import("./utils/generateResources.js");
      console.log("🔍 Resources not found, generating now...");
      const resources = await generateAdditionalResources(apod.date, apod.title, apod.explanation);
      if (resources.length > 0) {
        await updateApodWithResources(apod.date, resources);
        // Fetch updated APOD
        const updatedApod = await Apod.findOne({ date: apod.date }).lean();
        apod.additionalResources = updatedApod?.additionalResources || [];
      }
    }
    
    return res.status(200).json({
      date: apod.date,
      title: apod.title,
      url: apod.url,
      explanation: apod.explanation,
      media_type: apod.media_type,
      additionalResources: apod.additionalResources || []
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
