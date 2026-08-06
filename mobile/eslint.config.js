// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "coverage/*"],
  },
  {
    // Tests and the jest setup use require() on purpose: jest.mock factories are
    // hoisted above imports, and api.test.ts reloads the module under test with
    // a different environment for each case.
    files: ["**/*.test.ts", "**/*.test.tsx", "jest/**/*.ts"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);
