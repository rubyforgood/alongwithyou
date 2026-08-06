// The root HTML for the web build. Expo Router renders this during static
// rendering only - it never runs on a phone, and it is not a route.
// https://docs.expo.dev/router/reference/static-rendering/#root-html

import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// tailwind.config.js sets darkMode: 'class', so every dark style hangs off a
// `dark` class on <html>. On native NativeWind resolves that against the
// Appearance API and it just works; on web the class is only ever added by an
// explicit colorScheme.set() call, so with nothing calling it the dark half of
// the theme never applied at all.
//
// This runs before the bundle, which is both early enough for NativeWind to read
// the right scheme on startup and early enough to avoid a flash of the light
// theme. The listener keeps it in step if the system setting changes while the
// page is open.
const applyColorScheme = `
(function () {
  var query = window.matchMedia('(prefers-color-scheme: dark)');
  function apply(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
  }
  apply(query.matches);
  query.addEventListener('change', function (event) {
    apply(event.matches);
  });
})();
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Turns off body scrolling, so ScrollView behaves the way it does on
            native rather than the page scrolling underneath it. */}
        <ScrollViewStyleReset />

        <script dangerouslySetInnerHTML={{ __html: applyColorScheme }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
