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
- `src/components/ui/` — the React Native Reusables components (see below)
- `src/hooks/`, `src/constants/` — theming and colour scheme
- `src/lib/api.ts` — typed client for the Rails API
- `src/global.css`, `src/lib/theme.ts` — the design tokens `src/components/ui/` reads
- `src/lib/utils.ts` — the `cn` class-name helper
- `src/__tests__/` — tests for screens (see below)
- `assets/` — icons and splash screens
- `types/`, `nativewind-env.d.ts` — ambient declarations TypeScript cannot infer on its own
- `jest/` — jest setup and the CSS stub
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

Three things worth knowing:

- **`Text` comes from `@/components/ui/text`, not `react-native`.** These
  components hand their text styling down through React context, so a bare
  `<Text>` inside a `<Button>` renders unstyled.
- **Colours are class names, not values.** `bg-background`,
  `text-muted-foreground` and the rest read the CSS variables in
  `src/global.css`, which is what makes them follow the colour scheme with no
  conditionals. `THEME` in `src/lib/theme.ts` mirrors those variables for the
  few native props that want a real colour string - keep the two in step, and
  see [the customization
  guide](https://reactnativereusables.com/docs/customization) before changing
  either.
- **`src/components/ui/collapsible.tsx` is not one of theirs.** It predates the
  library, and `add collapsible` would overwrite it.

The screens written before this still style themselves through `ThemedText`,
`ThemedView` and `src/constants/theme.ts`. Both approaches work; moving them
over is a separate job.

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
Three suites to copy from:

- `src/lib/api.test.ts` — the client against a mocked `fetch`: how the API URL
  is resolved per platform, and what every failure turns into.
- `src/__tests__/tasks-screen.test.tsx` — the Tasks screen against a mocked
  `@/lib/api`: rendering, adding, toggling, and what a failed delete does.
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

## Documentation

- [Expo documentation](https://docs.expo.dev/versions/v57.0.0/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native documentation](https://reactnative.dev/docs/getting-started)
- [React Native Reusables](https://reactnativereusables.com/docs) — the components
- [NativeWind](https://www.nativewind.dev/docs) — Tailwind classes on React Native
- [Tailwind CSS](https://v3.tailwindcss.com/docs) — v3, which is what NativeWind 4 builds on
