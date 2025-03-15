/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
