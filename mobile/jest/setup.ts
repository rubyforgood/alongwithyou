// react-native-safe-area-context reads insets from native code that does not
// exist under jest. The package ships a mock for exactly this case.
// The mock is written as an ES default export, hence .default.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default
);

// react-native-reanimated goes through react-native-worklets, which is native
// too and throws on import - `Cannot read properties of undefined (reading
// 'loadUnpackers')` - before a test gets as far as rendering. Worklets ships a
// mock for it, and this is the setup its own Jest guide recommends:
// https://docs.swmansion.com/react-native-worklets/docs/guides/testing/
//
// Reaches this project through the Progress and Collapsible components.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
