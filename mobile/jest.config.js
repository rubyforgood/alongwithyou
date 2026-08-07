// Unit tests for the Expo app. https://docs.expo.dev/develop/unit-testing/
//
// Screen tests do NOT live in src/app/. Expo Router turns every file it finds
// there into a route - its context regex only skips +api, +html and
// +middleware - so a tasks.test.tsx beside tasks.tsx would ship as /tasks.test.
// Anything testing a screen goes in src/__tests__/ instead.

const { transform, transformIgnorePatterns } = require('jest-expo/jest-preset');

// Two of the packages the React Native Reusables components sit on need babel
// run over them before jest can load them at all: @rn-primitives publishes JSX
// rather than compiled JavaScript, and lucide-react-native publishes ESM under
// the `react-native` export condition. Miss either and a test that renders
// anything from src/components/ui/ fails inside node_modules on
// `Unexpected token '<'` or `Unexpected token 'export'`.
//
// transformIgnorePatterns is a key jest replaces rather than merges, and the
// first of jest-expo's three patterns is already an allowlist of node_modules to
// transform, so the two names belong inside that one. If a jest-expo upgrade
// changes its shape the replace below quietly stops matching and those syntax
// errors come back - this is the line to look at.
const [nodeModulesToTransform, ...otherIgnorePatterns] = transformIgnorePatterns;

/** @type {import('jest').Config} */
const config = {
  preset: 'jest-expo',

  transformIgnorePatterns: [
    nodeModulesToTransform.replace('(?!(', '(?!(@rn-primitives|lucide-react-native|'),
    ...otherIgnorePatterns,
  ],

  setupFilesAfterEnv: ['<rootDir>/jest/setup.ts'],

  // Jest merges moduleNameMapper and transform with the preset's own entries
  // rather than replacing them.
  transform: {
    // Allowing lucide-react-native through above is not enough on its own:
    // jest-expo only hands .js, .jsx, .ts and .tsx to babel, and the files in
    // question are .mjs. Same babel-jest setup, wider net.
    '\\.mjs$': transform['\\.[jt]sx?$'],
  },

  moduleNameMapper: {
    // The root layout imports global.css so NativeWind can compile it. Metro
    // resolves CSS, jest does not, and nothing under test reads those values -
    // className props survive the trip as plain props.
    '\\.css$': '<rootDir>/jest/style-mock.js',
  },

  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],

  // cacheDirectory is deliberately left at jest's default of /tmp/jest_<uid>.
  // A cold run babels ~6k files out of node_modules before the first component
  // renders - 45s of a 48s run, against 14s warm - so CI caches that directory
  // between runs, but it passes its own --cacheDirectory rather than setting it
  // here: pointing this at <rootDir> puts 6k small files in the working tree,
  // and reading them back over a bind mount (the repo mounted into Docker from
  // a macOS host, say) costs minutes of blocked I/O - far more than the babel
  // work it saves. See the Prepare Jest cache step in .github/workflows/ci.yml.
};

module.exports = config;
