// There was no babel config before NativeWind: babel-preset-expo's defaults
// were enough. NativeWind needs two additions.
//
// `jsxImportSource` routes every JSX element through NativeWind's runtime,
// which is what turns a `className` prop into styles, and `nativewind/babel`
// brings in the CSS interop itself.
//
// The React Compiler stays on. babel-preset-expo reads that from the Metro
// caller - app.json `experiments.reactCompiler` - and not from the options
// passed here, so naming the preset explicitly does not switch it off.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
