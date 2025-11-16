import { test } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';

// Test: JWT Token Creation
test('JWT token should be created with user data', () => {
  const secret = 'test-secret-key';
  const user = { id: '123', firstName: 'John', lastName: 'Doe' };
  
  const token = jwt.sign(user, secret, { expiresIn: '24h' });
  
  assert.ok(typeof token === 'string', 'Token should be a string');
  assert.ok(token.length > 0, 'Token should not be empty');
  
  const decoded = jwt.verify(token, secret);
  assert.strictEqual(decoded.id, user.id, 'Token should contain user id');
  assert.strictEqual(decoded.firstName, user.firstName, 'Token should contain firstName');
});

// Test: JWT Token Expiration Check
test('JWT token expiration should be checked', () => {
  const secret = 'test-secret-key';
  const user = { id: '123', firstName: 'John', lastName: 'Doe' };
  
  const validToken = jwt.sign(user, secret, { expiresIn: '24h' });
  const expiredToken = jwt.sign(user, secret, { expiresIn: '-1h' });
  
  try {
    jwt.verify(validToken, secret);
    assert.ok(true, 'Valid token should not throw');
  } catch (e) {
    assert.fail('Valid token should not throw error');
  }
  
  try {
    jwt.verify(expiredToken, secret);
    assert.fail('Expired token should throw error');
  } catch (e) {
    assert.ok(e.name === 'TokenExpiredError', 'Should throw TokenExpiredError');
  }
});

// Test: JWT Token Refresh
test('JWT token should be refreshable', () => {
  const secret = 'test-secret-key';
  const user = { id: '123', firstName: 'John', lastName: 'Doe' };
  
  const originalToken = jwt.sign(user, secret, { expiresIn: '24h' });
  const decoded = jwt.decode(originalToken, { complete: true });
  
  assert.ok(decoded, 'Token should be decodable');
  assert.strictEqual(decoded.payload.id, user.id, 'Decoded token should contain user id');
  
  const refreshedToken = jwt.sign(
    { id: decoded.payload.id, firstName: decoded.payload.firstName, lastName: decoded.payload.lastName },
    secret,
    { expiresIn: '24h' }
  );
  
  assert.ok(refreshedToken !== originalToken, 'Refreshed token should be different');
});

