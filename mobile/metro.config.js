// NativeWind compiles the Tailwind stylesheet through Metro. The `input` path
// is relative to this file, and the stylesheet lives under src/ with the rest
// of the source.
//
// `inlineRem` is NativeWind's pixel value for one rem, and it defaults to 14.
// React Native Reusables sizes its components against the web default of 16,
// so leaving the default in place makes every component a shade small.
// https://reactnativereusables.com/docs/installation/manual
//
// `typescriptEnvPath` is where NativeWind writes the reference to its own
// types. It is the default value, spelled out so it matches the entry in
// tsconfig.json's `include` - NativeWind rewrites tsconfig.json when it cannot
// find that path listed there.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: './src/global.css',
  inlineRem: 16,
  typescriptEnvPath: 'nativewind-env.d.ts',
});
