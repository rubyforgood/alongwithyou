// Unit tests for the Expo app. https://docs.expo.dev/develop/unit-testing/
//
// Screen tests do NOT live in src/app/. Expo Router turns every file it finds
// there into a route - its context regex only skips +api, +html and
// +middleware - so a tasks.test.tsx beside tasks.tsx would ship as /tasks.test.
// Anything testing a screen goes in src/__tests__/ instead.

/** @type {import('jest').Config} */
const config = {
  preset: 'jest-expo',

  setupFilesAfterEnv: ['<rootDir>/jest/setup.ts'],

  // Jest merges moduleNameMapper and transform with the preset's own entries
  // rather than replacing them.
  moduleNameMapper: {
    // constants/theme.ts imports global.css for the web font variables. Metro
    // resolves CSS, jest does not, and nothing under test reads those values.
    '\\.css$': '<rootDir>/jest/style-mock.js',
  },

  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};

module.exports = config;
