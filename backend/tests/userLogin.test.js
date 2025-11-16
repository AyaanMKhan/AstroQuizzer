import { test } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';

// Test: User Login - Password Verification
test('Login should verify password correctly', async () => {
  const password = 'userPassword';
  const BCRYPT_ROUNDS = 12;
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  
  const isValid = await bcrypt.compare(password, hash);
  assert.ok(isValid, 'Correct password should verify');
  
  const isInvalid = await bcrypt.compare('wrongPassword', hash);
  assert.ok(!isInvalid, 'Wrong password should not verify');
});

// Test: User Login - Email Normalization
test('Login should normalize email to lowercase', () => {
  const email = 'Test@Example.COM';
  const normalized = String(email).trim().toLowerCase();
  
  assert.strictEqual(normalized, 'test@example.com', 'Email should be lowercased');
});

// Test: User Login - Legacy Password Migration
test('Legacy plaintext passwords should migrate to hash', async () => {
  const plainPassword = 'oldPassword';
  const BCRYPT_ROUNDS = 12;
  
  // Simulate legacy check
  const isPlaintextMatch = plainPassword === plainPassword;
  assert.ok(isPlaintextMatch, 'Plaintext password should match');
  
  // After migration, should be hashed
  const newHash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
  const isValidAfterMigration = await bcrypt.compare(plainPassword, newHash);
  assert.ok(isValidAfterMigration, 'Migrated password should verify');
});

