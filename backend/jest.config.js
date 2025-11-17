export default {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.{js,ts}',
    '**/*.{spec,test}.{js,ts}',
  ],
  // Ignore frontend directory completely
  testPathIgnorePatterns: ['/node_modules/', '/frontend/'],
  modulePathIgnorePatterns: ['<rootDir>/frontend/'],
  transform: { '^.+\\.js$': 'babel-jest' },
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/frontend/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!babel.config.js',
  ],
  coverageDirectory: 'coverage',
};