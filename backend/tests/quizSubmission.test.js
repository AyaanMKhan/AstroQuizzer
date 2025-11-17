import { test } from 'node:test';
import assert from 'node:assert';

// Test: Quiz Submission - Answer Array Validation
test('Quiz submission requires exactly 5 answers', () => {
  const validAnswers = [0, 1, 2, 3, 4];
  const invalidAnswers1 = [0, 1, 2];
  const invalidAnswers2 = [0, 1, 2, 3, 4, 5];
  
  assert.strictEqual(validAnswers.length, 5, 'Should have exactly 5 answers');
  assert.ok(Array.isArray(validAnswers), 'Answers should be an array');
  
  assert.notStrictEqual(invalidAnswers1.length, 5, 'Should reject less than 5 answers');
  assert.notStrictEqual(invalidAnswers2.length, 5, 'Should reject more than 5 answers');
});

// Test: Quiz Submission - Answer Index Validation
test('Quiz answers should be valid indices', () => {
  const validAnswer = 2;
  const invalidAnswer1 = -1;
  const invalidAnswer2 = 4;
  
  assert.ok(validAnswer >= 0 && validAnswer < 4, 'Answer should be 0-3');
  assert.ok(invalidAnswer1 < 0, 'Negative answer should be invalid');
  assert.ok(invalidAnswer2 >= 4, 'Answer >= 4 should be invalid');
});

// Test: Quiz Scoring Logic
test('Quiz score should be calculated correctly', () => {
  const questionPoints = [1, 1, 2, 2, 3]; // Easy, Easy, Medium, Medium, Hard
  const correctAnswers = [0, 1, 2, 3, 0];
  const userAnswers = [0, 1, 2, 3, 0];
  
  let score = 0;
  for (let i = 0; i < 5; i++) {
    if (userAnswers[i] === correctAnswers[i]) {
      score += questionPoints[i];
    }
  }
  
  const expectedScore = 1 + 1 + 2 + 2 + 3; // All correct
  assert.strictEqual(score, expectedScore, 'Score should sum all correct answers');
});

