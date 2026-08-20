# Along With You mobile app

The React Native client, built with Expo SDK 57, TypeScript and Expo Router.
The Rails application in the repository root currently backs the `Tasks` demo
screen, but **it is not the backend for the real patient journal** — see
[Talking to Rails](#talking-to-rails) below and
[`docs/decisions/0001-local-only-architecture.md`](../docs/decisions/0001-local-only-architecture.md).

## This app does not run in Expo Go

Worth knowing before you start, because it changes what you need installed and
how long the first run takes.

The journal database is encrypted with SQLCipher, a native fork of SQLite
compiled into the app at build time rather than shipped with Expo Go. So running
this project means generating the native projects and building them yourself — a
**development build**. The first one takes tens of minutes and pulls down
several GB of native toolchain, and needs Xcode or Android Studio. After that
you are back to `npm start` and a reload, the same as before.

"Does not run" is, if anything, an undersell. Expo Go will happily *load* this
app and everything will appear to work — stock SQLite ignores SQLCipher's
`PRAGMA key` rather than erroring — so the screens render, the database opens,
and everything a user writes lands on disk **unencrypted**. Nothing crashes and
nothing warns. Treat this app ever launching in Expo Go as a bug in itself.
(`src/lib/db/database.ts` now refuses to open the journal on a build with no
SQLCipher, which turns that silence into an error, but the rule stands.)

The reasoning is in
[`docs/decisions/0016`](../docs/decisions/0016-development-builds-required.md);
the short version is that the alternative preserving Expo Go was hand-rolled
field encryption over plain SQLite, which is a worse thing to maintain and a
worse thing to trust with medical data.

The other consequence worth knowing up front: **testing on a physical iPhone now
needs a Mac**, or EAS Build. Expo Go used to be the way around that, and is not
any more — see [Running on a physical iPhone](#running-on-a-physical-iphone).

## Prerequisites

- Node.js 20.19.4 or newer — React Native 0.86 will not build on older versions.
  Use 22.x if you can: two test suites need `node:sqlite`, which arrived in 22.5,
  and that is what CI runs.
- npm
- **For iOS:** macOS with [Xcode](https://developer.apple.com/xcode/) installed,
  plus its command line tools. There is no way to build for iOS without a Mac.
- **For Android:** [Android Studio](https://developer.android.com/studio) with
  the SDK and either an emulator or a device with USB debugging on. This works
  on macOS, Linux and Windows.

You need one of those two, not both.

## Setup

```bash
cd mobile
npm install
npx expo prebuild        # generates the native ios/ and android/ projects
npx expo run:ios         # or: npx expo run:android
```

**`prebuild` will stop and ask you for a bundle identifier** (and an Android
package name) the first time, because `app.json` does not set them yet. Do not
invent one to get past the prompt — whatever you answer is written into
`app.json` and becomes the app's permanent identity in the App Store and on
every device. Ask first if it is still unset.

`run:ios` and `run:android` compile the app and install it on a simulator,
emulator or connected device. **Expect the first build to be slow** — it is
compiling native code, SQLCipher included. Later builds are much quicker, and
you only need to build again when a native dependency or `app.json` changes.

(`run:ios` and `run:android` run `prebuild` for you if the native projects are
missing. It is listed separately above so it is clear what is happening.)

`ios/` and `android/` are generated rather than checked in, so `app.json` stays
the one reviewable place the native configuration lives. They are gitignored,
and `npx expo prebuild --clean` regenerates them if they get into a bad state.

Start the Rails API too, or the **Tasks** demo screen will load with a
connection error. The journal itself needs no server — see
[Talking to Rails](#talking-to-rails).

```bash
# from the repository root, in another terminal
bin/rails server -b 0.0.0.0
```

After the first build, day to day is:

```bash
npm start        # runs expo start --dev-client
```

and pressing `i` or `a` to open the build you already installed. The
`--dev-client` flag is what aims those keys at your build: `expo start` picks
its default target by whether `expo-dev-client` is in `package.json` — it is
not — so a bare `npx expo start` would install and open **Expo Go** instead,
which fails in the quiet way described above. (`run:ios` and `run:android`
force the flag themselves, which is why the first day works and the morning
after is where this used to bite.) With the flag, if no build is installed the
CLI says so and stops rather than reaching for Expo Go.

A QR code still prints, but it now opens your installed build via its URL
scheme rather than Expo Go — and since the build has its Metro host baked in
(see the note on `expo-dev-client` below), it does nothing that tapping the
app icon does not.

Your computer and phone still need to be on the same network for Metro to serve
the bundle; if local discovery fails, try a tunnel:

```bash
npx expo start --dev-client --tunnel
```

Note that a tunnel only routes the JavaScript bundle, not your API. See the
root README for the full story, including WSL2 port forwarding.

## Running on a physical iPhone

Worth doing, and not only for convenience — several things this app depends on
cannot be checked in a simulator at all. See the end of this section.

You need a Mac with Xcode, but **a free Apple ID is enough**. There is nothing
here that requires a paid developer account: no push notifications, no app
groups, no associated domains. Keychain and Face ID both work under free
provisioning.

```bash
npx expo run:ios --device     # then pick your iPhone from the list
```

If signing fails — likely the first time on a free account — open
`ios/*.xcworkspace` in Xcode once, select the app target, go to **Signing &
Capabilities**, tick *Automatically manage signing*, and set Team to your
personal team. Then run the command again. On the phone, the first launch needs
**Settings → General → VPN & Device Management**, where you trust the developer
certificate.

After that first build over the cable, tick *Connect via network* in Xcode's
Window → Devices and Simulators, and you can leave the cable in a drawer.

Day to day is then the same as everywhere else: `npm start` on the Mac, open the
app on the phone, Fast Refresh. Both need to be on the same Wi-Fi.

Two things a free account costs you:

- **The build expires after seven days.** Re-run `npx expo run:ios --device`;
  it is incremental and much faster than the first one.
- **Three self-signed apps per device**, total, across everything you develop.

If you do this often, install [`expo-dev-client`](https://docs.expo.dev/develop/development-builds/introduction/).
Without it the Metro host is baked in at build time, so the build stops finding
your Mac whenever its address on the network changes; with it you get a launcher
that lets you enter or scan the URL instead of rebuilding.

### What only a real device can tell you

- **Face ID and the unlock gate.** Simulators do not enforce biometric
  authentication when retrieving a stored secret, which expo-secure-store's own
  documentation calls out — so the whole unlock path in
  [`docs/decisions/0015`](../docs/decisions/0015-database-key-storage.md)
  behaves differently there and a green simulator run proves nothing about it.
- **That the database is actually encrypted.** Nothing in the test suite shows
  this, because `node:sqlite` is stock SQLite with no SQLCipher.
- **Keychain behaviour** — whether the key survives what it should and does not
  survive what it should not.

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

`npm run ios` and `npm run android` are `expo run:ios` / `expo run:android` —
the full compile-and-install from [Setup](#setup), not a bundler-only start.
Reach for them when a native dependency or `app.json` changes; the rest of the
time, `npm start` against the build you already have is the whole loop.

The iOS simulator requires macOS and Xcode, and so now does any iOS device.
Android requires Android Studio.

**`npm run web` is not a preview of the app.** It serves the landing and
marketing surface, and nothing that touches journal data. SQLCipher has no web
build, so per
[`docs/decisions/0017`](../docs/decisions/0017-journal-data-is-native-only.md)
the journal database refuses to open in a browser rather than falling back to
writing an unencrypted medical journal into browser storage. Any screen that
reads the journal throws there instead of rendering, and that is deliberate.

### Showing the app to someone

Expo Go used to make this a one-minute job and no longer does. The options now
are a shared development build, or the web landing page for anything that does
not need journal data.

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
