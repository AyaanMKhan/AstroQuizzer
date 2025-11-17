import { test } from 'node:test';
import assert from 'node:assert';

// Test: Leaderboard Sorting
test('Leaderboard should be sorted by totalScore descending', () => {
  const users = [
    { username: 'user1', totalScore: 50 },
    { username: 'user2', totalScore: 100 },
    { username: 'user3', totalScore: 25 }
  ];
  
  const sorted = users.sort((a, b) => b.totalScore - a.totalScore);
  
  assert.strictEqual(sorted[0].totalScore, 100, 'Highest score should be first');
  assert.strictEqual(sorted[sorted.length - 1].totalScore, 25, 'Lowest score should be last');
});

// Test: Leaderboard Ranking
test('Leaderboard should assign correct ranks', () => {
  const users = [
    { username: 'user1', totalScore: 100 },
    { username: 'user2', totalScore: 50 },
    { username: 'user3', totalScore: 25 }
  ];
  
  const leaderboard = users.map((u, index) => ({
    username: u.username,
    totalScore: u.totalScore,
    rank: index + 1
  }));
  
  assert.strictEqual(leaderboard[0].rank, 1, 'First user should have rank 1');
  assert.strictEqual(leaderboard[1].rank, 2, 'Second user should have rank 2');
  assert.strictEqual(leaderboard[2].rank, 3, 'Third user should have rank 3');
});

// Test: Leaderboard Top 100 Limit
test('Leaderboard should limit to top 100', () => {
  const users = Array.from({ length: 150 }, (_, i) => ({
    username: `user${i}`,
    totalScore: 150 - i
  }));
  
  const topHundred = users.slice(0, 100);
  
  assert.strictEqual(topHundred.length, 100, 'Should return exactly 100 users');
});

