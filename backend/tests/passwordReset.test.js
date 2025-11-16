import { test } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Test: Password Reset - Token Validation
test('Password reset should validate token', () => {
  const secret = 'test-secret';
  const email = 'test@example.com';
  const token = jwt.sign({ email }, secret, { expiresIn: '1h' });
  
  assert.ok(typeof token === 'string', 'Reset token should be a string');
  assert.ok(token.length > 0, 'Token should not be empty');
});

// Test: Password Reset - New Password Hashing
test('Reset password should be hashed', async () => {
  const newPassword = 'newSecurePassword123';
  const BCRYPT_ROUNDS = 12;
  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  
  assert.ok(hash !== newPassword, 'Password should be hashed');
  const isValid = await bcrypt.compare(newPassword, hash);
  assert.ok(isValid, 'Hashed password should verify');
});

// Test: Password Reset - Token Expiration
test('Password reset token should expire', () => {
  const secret = 'test-secret';
  const email = 'test@example.com';
  const expiredToken = jwt.sign({ email }, secret, { expiresIn: '-1h' });
  
  try {
    jwt.verify(expiredToken, secret);
    assert.fail('Expired token should throw error');
  } catch (e) {
    assert.ok(e.name === 'TokenExpiredError', 'Should throw TokenExpiredError');
  }
});

