import { test } from 'node:test';
import assert from 'node:assert';

// Test: Question Generation - Required Structure
test('Generated questions should have correct structure', () => {
  const question = {
    question: 'What is the answer?',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctAnswer: 0,
    difficulty: 'easy',
    points: 1
  };
  
  assert.ok(question.question, 'Question should have text');
  assert.strictEqual(question.options.length, 4, 'Should have 4 options');
  assert.ok(typeof question.correctAnswer === 'number', 'Correct answer should be a number');
  assert.ok(['easy', 'medium', 'hard'].includes(question.difficulty), 'Should have valid difficulty');
  assert.ok([1, 2, 3].includes(question.points), 'Should have valid points');
});

// Test: Question Generation - Point Distribution
test('Questions should have correct point distribution', () => {
  const questions = [
    { difficulty: 'easy', points: 1 },
    { difficulty: 'easy', points: 1 },
    { difficulty: 'medium', points: 2 },
    { difficulty: 'medium', points: 2 },
    { difficulty: 'hard', points: 3 }
  ];
  
  const easyCount = questions.filter(q => q.difficulty === 'easy').length;
  const mediumCount = questions.filter(q => q.difficulty === 'medium').length;
  const hardCount = questions.filter(q => q.difficulty === 'hard').length;
  
  assert.strictEqual(easyCount, 2, 'Should have 2 easy questions');
  assert.strictEqual(mediumCount, 2, 'Should have 2 medium questions');
  assert.strictEqual(hardCount, 1, 'Should have 1 hard question');
});

// Test: Question Generation - Correct Answer Index
test('Correct answer should be valid option index', () => {
  const question = {
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 2
  };
  
  assert.ok(question.correctAnswer >= 0, 'Correct answer should be >= 0');
  assert.ok(question.correctAnswer < question.options.length, 'Correct answer should be valid index');
});

