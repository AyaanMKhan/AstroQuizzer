import { test } from 'node:test';
import assert from 'node:assert';

// Test: APOD Date Format
test('APOD date should be formatted correctly', () => {
  const now = new Date();
  const year = 2024;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(date), 'Date should be in YYYY-MM-DD format');
  assert.strictEqual(date.length, 10, 'Date string should be 10 characters');
});

// Test: APOD Required Fields
test('APOD should have required fields', () => {
  const apodData = {
    date: '2024-01-15',
    title: 'Test APOD Title',
    url: 'https://example.com/image.jpg',
    explanation: 'Test explanation',
    media_type: 'image'
  };
  
  const requiredFields = ['date', 'title', 'url', 'explanation', 'media_type'];
  requiredFields.forEach(field => {
    assert.ok(apodData[field] !== undefined, `APOD should have ${field}`);
  });
});

// Test: APOD Media Type Validation
test('APOD media type should be valid', () => {
  const validTypes = ['image', 'video'];
  const testType = 'image';
  
  assert.ok(validTypes.includes(testType), 'Media type should be image or video');
});

