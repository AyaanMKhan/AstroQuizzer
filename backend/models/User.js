import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  quizzesTaken: {
    type: Number,
    default: 0,
    min: 0
  },
  totalScore: {
    type: Number,
    default: 0,
    min: 0
  },
  currentDaysPoints: {
    type: Number,
    default: 0,
    min: 0
    // Reset to 0 daily at 01:00 UTC when new APOD/questions are available
  },
  dailyQuizCompleted: {
    type: Boolean,
    default: false
    // Reset to false daily at 01:00 UTC when new APOD/questions are available
  },
  // Legacy field for old plaintext passwords
  password: {
    type: String,
    select: false
  }
}, {
  timestamps: true
});

const User = mongoose.model("User", userSchema);

export default User;

