# Along With You mobile app

This directory contains the React Native mobile client. It uses Expo SDK 54,
TypeScript, and Expo Router. The Rails application in the repository root will
remain the backend and web application.

## Prerequisites

- Node.js 20.19 or newer (use an LTS release)
- npm
- [Expo Go](https://expo.dev/go) on an Android or iOS device

## Setup

From the repository root:

```bash
cd mobile
npm install
npm start
```

Scan the QR code with Expo Go. Your development computer and phone should be on
the same network. If local network discovery does not work, start Expo using a
tunnel:

```bash
npx expo start --tunnel
```

Other useful commands:

```bash
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
```

The iOS simulator requires macOS and Xcode. Expo Go can still run the app on a
physical iPhone without a Mac.

## Project structure

- `app/`: file-based screens and navigation
- `components/`: reusable React Native components
- `assets/`: icons, splash screens, and other static assets
- `app.json`: Expo application configuration

The current screens are Expo starter content. No Rails API connection has been
configured yet.

## Documentation

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native documentation](https://reactnative.dev/docs/getting-started)
