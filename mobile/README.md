# Along With You mobile app

The React Native client, built with Expo SDK 57, TypeScript and Expo Router.
The Rails application in the repository root currently backs the `Tasks` demo
screen, but **it is not the backend for the real patient journal** — see
[Talking to Rails](#talking-to-rails) below and
[`docs/decisions/0001-local-only-architecture.md`](../docs/decisions/0001-local-only-architecture.md).

## Prerequisites

- Node.js 20.19.4 or newer (React Native 0.86 will not build on older versions)
- npm
- **Xcode** for iOS, which needs macOS — or **Android Studio** with the Android
  SDK for Android

**This app no longer runs in [Expo Go](https://expo.dev/go).** The journal is
encrypted with SQLCipher, which is a native fork of SQLite that Expo Go does not
ship, so running the app means building it yourself.
[`docs/decisions/0016`](../docs/decisions/0016-development-builds-required.md)
argues the trade. Two consequences are worth knowing before you start rather
than discovering half way through:

- **The first build takes tens of minutes** and pulls down several GB of native
  toolchain. Builds after that are quick, and day-to-day work only needs Metro.
- **Testing on a physical iPhone now needs a Mac**, or EAS Build. Expo Go used
  to be the way around that, and is not any more.

## Setup

```bash
cd mobile
npm install
npx expo prebuild     # generates ios/ and android/ from app.json
npm run ios           # or: npm run android
```

`ios/` and `android/` are generated rather than checked in — `npx expo prebuild`
recreates them from `app.json`, which keeps the native configuration in one
reviewable place. Re-run it after changing `app.json`, or after adding a
dependency that has native code.

Once the development build is installed on the simulator or device, `npm start`
runs Metro on its own and the app picks it up, the same as it always did. You
only need to build again when native code changes.

Start the Rails API too, or the **Tasks** demo screen will load with a
connection error. The journal itself needs no server — see
[Talking to Rails](#talking-to-rails).

```bash
# from the repository root, in another terminal
bin/rails server -b 0.0.0.0
```

Your computer and phone need to be on the same network; if local discovery
fails, try a tunnel:

```bash
npx expo start --tunnel
```

Note that a tunnel only routes the JavaScript bundle, not your API. See the
root README for the full story, including WSL2 port forwarding.

## Other commands

```bash
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
npm test
npm run test:watch
```

`npm run ios` and `npm run android` build and install the development build,
so the first run of either is the slow one described above.

The iOS simulator requires macOS and Xcode, and so now does any iOS device.

`npm run web` serves the landing page only. Per
[`docs/decisions/0017`](../docs/decisions/0017-journal-data-is-native-only.md)
SQLCipher has no web build, so the journal deliberately refuses to open in a
browser rather than quietly falling back to unencrypted storage. `npm run web`
is not a preview of the app.

## Project structure

- `src/app/` — file-based screens and navigation
- `src/components/` — reusable components
- `src/components/ui/` — the React Native Reusables components (see below)
- `src/hooks/`, `src/constants/` — theming and colour scheme
- `src/lib/api.ts` — typed client for the Rails API
- `src/lib/db/` — the SQLCipher-encrypted journal: key storage, migrations, and
  the repeatable-entry repository
- `src/lib/auth/` — biometric unlock, applied by `src/components/unlock-gate.tsx`
- `src/global.css`, `src/lib/theme.ts` — the design tokens `src/components/ui/` reads
- `src/lib/utils.ts` — the `cn` class-name helper
- `src/__tests__/` — tests for screens (see below)
- `assets/` — icons and splash screens
- `types/`, `nativewind-env.d.ts` — ambient declarations TypeScript cannot infer on its own
- `jest/` — jest setup, the CSS stub, and the in-memory SQLite test double
- `app.json` — Expo configuration
- `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `components.json` — NativeWind and the component CLI

The `@/` import alias points at `src/`.

## UI components

[React Native Reusables](https://reactnativereusables.com) — shadcn/ui for React
Native, on top of [NativeWind](https://www.nativewind.dev), which compiles
Tailwind classes into React Native styles.

```tsx
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

<Button variant="outline" className="mt-4" onPress={save}>
  <Text>Save</Text>
</Button>;
```

The components are checked into `src/components/ui/` rather than installed from
npm, so they are ours to edit. Add more of them with the CLI:

```bash
npx @react-native-reusables/cli@latest add dialog
npx @react-native-reusables/cli@latest doctor   # re-checks the setup
```

The catalogue is at
[reactnativereusables.com/docs/components](https://reactnativereusables.com/docs/components).
Anything that renders over the page — dialogs, dropdown menus, popovers,
tooltips — goes through the `PortalHost` in `src/app/_layout.tsx`, which is
already mounted.

Four things worth knowing:

- **`Text` comes from `@/components/ui/text`, not `react-native`.** These
  components hand their text styling down through React context, so a bare
  `<Text>` inside a `<Button>` renders unstyled.
- **Colours are class names, not values.** `bg-primary`,
  `text-muted-foreground` and the rest read the CSS variables in
  `src/global.css` - see the theme section below.
- **Import icons one at a time.** `import Clock from
  'lucide-react-native/icons/clock'`, never `import { Clock } from
  'lucide-react-native'`. Metro does not tree-shake, so the barrel drags all
  ~1500 icons in: about 1.8MB of bundle, on an app that is otherwise 3.8MB.
- **`src/components/ui/collapsible.tsx` is not one of theirs.** It predates the
  library, and `add collapsible` would overwrite it.

The screens written before this still style themselves through `ThemedText`,
`ThemedView` and `src/constants/theme.ts`, but that palette is derived from the
theme now, so they follow it. Rewriting them in Tailwind is a separate job.

## The theme

One palette, defined once as CSS variables in `src/global.css` and reached three
ways:

| | |
|---|---|
| `src/global.css` | the source of truth - Tailwind class names resolve to these |
| `src/lib/theme.ts` | the same values as colour strings, for props that take a colour rather than a class. `NAV_THEME` shapes them for navigation |
| `src/constants/theme.ts` | `Colors`, derived from the above, for the screens still on `StyleSheet` and for the native tab bar |

Change a colour in `src/global.css` and it reaches the whole app - but update
`src/lib/theme.ts` to match, or the two drift.

The brand teal is **`rgb(35, 170, 172)`** — `hsl(181 66% 41%)`, `#23AAAC`. It is
the primary in dark mode. In light mode the primary is the same hue and
saturation at 29% lightness (`#19797B`), because the brand teal is too light to
put white text on: 2.8:1, where WCAG AA wants 4.5:1. Deepening it buys 5.2:1 for
a white label and 5.1:1 as ink on the background, so one teal does buttons,
links, icons and focus rings instead of needing a shade for each.

**Every colour pair clears WCAG AA in both schemes** — 4.5:1 for text, 3:1 for
interface colour. That is not decoration here: this is a journal for people in
cancer treatment, often read while exhausted, often on a phone in bad light. If
you change a value, check the contrast before shipping it.

## Talking to Rails

`src/lib/api.ts` works out where the API lives by reusing the address Metro is
already serving the bundle from, so `localhost` resolving differently on the
iOS simulator, the Android emulator (`10.0.2.2`) and real devices is handled for
you. Override it with `EXPO_PUBLIC_API_URL` in `.env` — see `.env.example`.
Release builds have no Metro server to ask, so they require it.

The **Tasks** tab is a working example of the round trip: it lists, creates,
toggles and deletes records through `/api/v1/tasks`. `Task` is a placeholder
resource — but it's a placeholder for *this client/server round-trip pattern*,
not a template to copy for real journal data. Per
[`docs/decisions/0001`](../docs/decisions/0001-local-only-architecture.md), the
actual medications/contacts/medical-history models are local-only (on-device
SQLite, encrypted at rest), with no Rails involvement. If you're adding a real
data model, check [`docs/decisions/`](../docs/decisions/README.md) first —
0001 for where the data lives, and
[0006](../docs/decisions/0006-excluded-field-safety-boundary.md) for fields
that must not be collected at all (SSNs, portal passwords, alarm codes, exact
key/wallet locations).

## Tests

```bash
npm test              # once, which is what CI runs
npm run test:watch    # while working
```

[jest-expo](https://docs.expo.dev/develop/unit-testing/) plus [React Native
Testing Library](https://callstack.github.io/react-native-testing-library/).
Four suites to copy from:

- `src/lib/api.test.ts` — the client against a mocked `fetch`: how the API URL
  is resolved per platform, and what every failure turns into.
- `src/__tests__/tasks-screen.test.tsx` — the Tasks screen against a mocked
  `@/lib/api`: rendering, adding, toggling, and what a failed delete does.
- `src/__tests__/landing-screen.test.tsx` — the landing screen: its heading,
  its two ways in, and the line saying it is not medical advice.
- `src/components/ui/reusables.test.tsx` — that the components in
  `src/components/ui/` still mount, which is the thing the NativeWind setup
  breaks first.

Three things to know before writing more:

- **Tests for screens do not go in `src/app/`.** Expo Router turns every file
  there into a route, so `src/app/tasks.test.tsx` would ship as `/tasks.test`.
  Screen tests live in `src/__tests__/`; tests for anything else sit next to the
  code they cover.
- **`render()` and `fireEvent()` are async** in React Native Testing Library 14.
  Forget an `await` and nothing is mounted, with a misleading "`render` function
  has not been called" further down the test.
- **There are no styles to assert on.** NativeWind turns class names into styles
  inside Metro, and jest stubs the stylesheet out, so `className` arrives as a
  plain prop and `style` is never set. Assert on behaviour, roles and text; use
  `className` only where the class itself is the point.
- **Two suites need Node 22.5 or newer.** `src/lib/db/migrations.test.ts` and
  `src/lib/db/repository.test.ts` run against real SQLite through `node:sqlite`,
  which older Node does not have. They *skip* rather than fail below that, so a
  green run on Node 20 has quietly exercised about thirty fewer tests than CI
  does. Check the skip count, or use the version CI uses.

Note that nothing in the suite proves the database is actually encrypted:
`node:sqlite` is stock SQLite with no SQLCipher, so encryption is verified on a
device instead (issue #101). `jest/in-memory-sqlite.ts` says so at the top.

## Documentation

- [`docs/decisions/`](../docs/decisions/README.md) — product & architecture
  decisions (read this first)
- [Expo documentation](https://docs.expo.dev/versions/v57.0.0/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native documentation](https://reactnative.dev/docs/getting-started)
- [React Native Reusables](https://reactnativereusables.com/docs) — the components
- [NativeWind](https://www.nativewind.dev/docs) — Tailwind classes on React Native
- [Tailwind CSS](https://v3.tailwindcss.com/docs) — v3, which is what NativeWind 4 builds on
