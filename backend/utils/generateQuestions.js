import { generateText } from "./geminiClient.js";
import Question from "../models/Question.js";
import Apod from "../models/Apod.js";

/**
 * Generates 5 multiple choice questions about the daily APOD
 * Uses Gemini LLM to create questions based on title and explanation
 * @param {string} date - APOD date (e.g., "2024-01-15")
 * @param {string} title - APOD title
 * @param {string} explanation - APOD explanation
 * @returns {Promise<Array>} Array of question objects
 */
export async function generateQuestions(date, title, explanation) {
  try {
    console.log(`📝 Generating questions for APOD: ${title}...`);

    const prompt = `You are an astronomy educator creating a quiz about NASA's Astronomy Picture of the Day.

TITLE: ${title}

EXPLANATION: ${explanation}

Create exactly 5 multiple-choice questions about this APOD. Requirements:
- 2 easy questions (worth 1 point each): Basic facts from the title or first part of explanation
- 2 medium questions (worth 2 points each): Require understanding key concepts from the explanation
- 1 hard question (worth 3 points): Deeper understanding or inference about the astronomical concepts

Format your response as a JSON array with this exact structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "difficulty": "easy",
    "points": 1
  },
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 1,
    "difficulty": "easy",
    "points": 1
  },
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 2,
    "difficulty": "medium",
    "points": 2
  },
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 3,
    "difficulty": "medium",
    "points": 2
  },
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "difficulty": "hard",
    "points": 3
  }
]

IMPORTANT:
- Return ONLY valid JSON, no additional text before or after
- correctAnswer must be 0, 1, 2, or 3 (index of correct option)
- Points: easy=1, medium=2, hard=3
- Each question must have exactly 4 options
- Questions should be educational and directly related to the APOD content
- Make incorrect options plausible but clearly wrong`;

    const response = await generateText(prompt, "gemini-2.5-flash", false);
    
    // Extract JSON from response (handle cases where model adds extra text)
    let jsonStr = response.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '').trim();
    }
    
    // Parse JSON
    let questions;
    try {
      questions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("❌ Failed to parse questions JSON:", parseError.message);
      console.error("Raw response:", jsonStr.substring(0, 500));
      throw new Error("Invalid JSON response from Gemini");
    }

    // Validate structure
    if (!Array.isArray(questions) || questions.length !== 5) {
      throw new Error(`Expected 5 questions, got ${questions.length}`);
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`Invalid question structure at index ${i}`);
      }
      if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
        throw new Error(`Invalid correctAnswer at index ${i}`);
      }
      if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
        throw new Error(`Invalid difficulty at index ${i}`);
      }
      // Validate points match difficulty
      const expectedPoints = q.difficulty === 'easy' ? 1 : q.difficulty === 'medium' ? 2 : 3;
      if (q.points !== expectedPoints) {
        console.warn(`⚠️ Points mismatch for question ${i}, correcting ${q.points} to ${expectedPoints}`);
        q.points = expectedPoints;
      }
    }

    // Validate distribution: 2 easy, 2 medium, 1 hard
    const difficultyCounts = {
      easy: questions.filter(q => q.difficulty === 'easy').length,
      medium: questions.filter(q => q.difficulty === 'medium').length,
      hard: questions.filter(q => q.difficulty === 'hard').length
    };
    
    if (difficultyCounts.easy !== 2 || difficultyCounts.medium !== 2 || difficultyCounts.hard !== 1) {
      console.warn(`⚠️ Question distribution: ${difficultyCounts.easy} easy, ${difficultyCounts.medium} medium, ${difficultyCounts.hard} hard (expected: 2 easy, 2 medium, 1 hard)`);
    }

    console.log(`✅ Generated ${questions.length} questions for ${date}`);
    return questions;

  } catch (err) {
    console.error("❌ Question generation error:", err.message);
    throw err;
  }
}

/**
 * Stores or updates questions for a given APOD date
 * Deletes all previous days' questions, keeping only today's
 * @param {string} date - APOD date
 * @param {Array} questions - Array of question objects
 */
export async function storeQuestions(date, questions) {
  try {
    // Delete all previous days' questions (keep only today's)
    const deleteResult = await Question.deleteMany({ date: { $ne: date } });
    if (deleteResult.deletedCount > 0) {
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} old question record(s)`);
    }

    // Check if this date already exists
    const existing = await Question.findOne({ date });
    
    if (existing) {
      existing.questions = questions;
      await existing.save();
      console.log(`✅ Updated questions for ${date}`);
    } else {
      await Question.create({ date, questions });
      console.log(`✅ Stored questions for ${date}`);
    }
  } catch (err) {
    console.error("❌ Error storing questions:", err.message);
    throw err;
  }
}

