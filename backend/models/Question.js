import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true,
    index: true
    // References APOD date (e.g., "2024-01-15")
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 4; // Exactly 4 options
        },
        message: "Each question must have exactly 4 options"
      }
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      max: 3
      // Index of correct option (0-3)
    },
    difficulty: {
      type: String,
      required: true,
      enum: ["easy", "medium", "hard"]
    },
    points: {
      type: Number,
      required: true,
      enum: [1, 2, 3] // 1 for easy, 2 for medium, 3 for hard
    }
  }],
  // Track when questions were generated
  createdAt: Date,
  updatedAt: Date
}, {
  timestamps: true
});

// Ensure questions array has exactly 5 questions
questionSchema.pre('save', function(next) {
  if (this.questions && this.questions.length !== 5) {
    return next(new Error('Questions array must contain exactly 5 questions'));
  }
  next();
});

const Question = mongoose.model("Question", questionSchema);

export default Question;
