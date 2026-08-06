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
```

The iOS simulator requires macOS and Xcode. Expo Go still runs the app on a
physical iPhone without a Mac.

## Project structure

- `src/app/` — file-based screens and navigation
- `src/components/` — reusable components
- `src/hooks/`, `src/constants/` — theming and colour scheme
- `src/lib/api.ts` — typed client for the Rails API
- `assets/` — icons and splash screens
- `types/` — ambient declarations TypeScript cannot infer on its own
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

## Documentation

- [Expo documentation](https://docs.expo.dev/versions/v57.0.0/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native documentation](https://reactnative.dev/docs/getting-started)
