# Along With You mobile app

The React Native client, built with Expo SDK 57, TypeScript and Expo Router.
The Rails application in the repository root is the backend.

## Prerequisites

- Node.js 20.19.4 or newer (React Native 0.86 will not build on older versions)
- npm
- [Expo Go](https://expo.dev/go) on an Android or iOS device, or a simulator

## Setup

```bash
cd mobile
npm install
npm start
```

Start the Rails API too, or the app will load with a connection error:

```bash
# from the repository root, in another terminal
bin/rails server -b 0.0.0.0
```

Then press `i` for the iOS simulator, `a` for the Android emulator, `w` for the
browser, or scan the QR code with Expo Go. Your computer and phone need to be on
the same network; if local discovery fails, try a tunnel:

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

The iOS simulator requires macOS and Xcode. Expo Go still runs the app on a
physical iPhone without a Mac.

## Project structure

- `src/app/` — file-based screens and navigation
- `src/components/` — reusable components
- `src/hooks/`, `src/constants/` — theming and colour scheme
- `src/lib/api.ts` — typed client for the Rails API
- `src/__tests__/` — tests for screens (see below)
- `assets/` — icons and splash screens
- `types/` — ambient declarations TypeScript cannot infer on its own
- `jest/` — jest setup and the CSS stub
- `app.json` — Expo configuration

The `@/` import alias points at `src/`.

## Talking to Rails

`src/lib/api.ts` works out where the API lives by reusing the address Metro is
already serving the bundle from, so `localhost` resolving differently on the
iOS simulator, the Android emulator (`10.0.2.2`) and real devices is handled for
you. Override it with `EXPO_PUBLIC_API_URL` in `.env` — see `.env.example`.
Release builds have no Metro server to ask, so they require it.

The **Tasks** tab is a working example of the round trip: it lists, creates,
toggles and deletes records through `/api/v1/tasks`. `Task` is a placeholder
resource, meant to be replaced with your real model.

## Tests

```bash
npm test              # once, which is what CI runs
npm run test:watch    # while working
```

[jest-expo](https://docs.expo.dev/develop/unit-testing/) plus [React Native
Testing Library](https://callstack.github.io/react-native-testing-library/).
Two suites to copy from:

- `src/lib/api.test.ts` — the client against a mocked `fetch`: how the API URL
  is resolved per platform, and what every failure turns into.
- `src/__tests__/tasks-screen.test.tsx` — the Tasks screen against a mocked
  `@/lib/api`: rendering, adding, toggling, and what a failed delete does.

Two things to know before writing more:

- **Tests for screens do not go in `src/app/`.** Expo Router turns every file
  there into a route, so `src/app/tasks.test.tsx` would ship as `/tasks.test`.
  Screen tests live in `src/__tests__/`; tests for anything else sit next to the
  code they cover.
- **`render()` and `fireEvent()` are async** in React Native Testing Library 14.
  Forget an `await` and nothing is mounted, with a misleading "`render` function
  has not been called" further down the test.

## Documentation

- [Expo documentation](https://docs.expo.dev/versions/v57.0.0/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native documentation](https://reactnative.dev/docs/getting-started)
