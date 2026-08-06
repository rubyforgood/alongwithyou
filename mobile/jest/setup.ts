// react-native-safe-area-context reads insets from native code that does not
// exist under jest. The package ships a mock for exactly this case.
// The mock is written as an ES default export, hence .default.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default
);
