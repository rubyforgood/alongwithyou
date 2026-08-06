// Ambient types for the things TypeScript cannot resolve on its own: the CSS
// imports under src/, `__DEV__`, `process.env.EXPO_OS` and the rest of the
// React Native globals.
//
// Expo writes the same reference into expo-env.d.ts, but that file is generated
// by the CLI and gitignored, so `npm run typecheck` failed on a fresh clone
// until someone had started the dev server at least once. Keeping the reference
// here makes the check standalone; the generated file is identical, so the two
// coexist without conflict.

/// <reference types="expo/types" />
