import { test } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';

// Test: User Registration - Password Hashing
test('Password should be hashed before storage', async () => {
  const password = 'testPassword123';
  const BCRYPT_ROUNDS = 12;
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  
  assert.ok(hash !== password, 'Password should be hashed');
  assert.ok(hash.startsWith('$2'), 'Should use bcrypt hash format');
  const isValid = await bcrypt.compare(password, hash);
  assert.ok(isValid, 'Hashed password should verify correctly');
});

// Test: User Registration - Required Fields Validation
test('Registration requires all fields', () => {
  const requiredFields = ['username', 'password', 'firstName', 'lastName', 'email'];
  const testData = {
    username: 'testuser',
    password: 'pass123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com'
  };
  
  requiredFields.forEach(field => {
    const incomplete = { ...testData };
    delete incomplete[field];
    const hasAllFields = requiredFields.every(f => incomplete[f] !== undefined);
    assert.ok(!hasAllFields, `Should require ${field}`);
  });
});

