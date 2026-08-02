# Alongwithyou

A Rails 8 JSON API with a React Native phone app built on Expo.

```
.              Rails 8.1 API (Ruby 4.0, SQLite)
├─ app/        └─ app/controllers/api/v1  JSON endpoints
└─ mobile/     Expo SDK 57 app (React 19, React Native 0.86, TypeScript)
               └─ src/lib/api.ts          typed client for the API above
```

The two halves are independent programs that talk over HTTP. Rails never renders
the phone UI, and the phone app is not served by Rails; it is bundled by Metro
in development and shipped to the app stores by EAS in production.

## Requirements

| | |
|---|---|
| Ruby | 4.0.5 (see `.ruby-version`) |
| Node | **20.19.4 or newer** — React Native 0.86 refuses to build on older versions |

If `node -v` reports something older, install a current LTS with
[nvm](https://github.com/nvm-sh/nvm):

```sh
nvm install --lts
nvm use --lts
```

## Setup

```sh
bin/setup --skip-server     # gems, database, seed data
(cd mobile && npm install)  # phone app dependencies
```

## Running it

You need both processes up. Use two terminals:

```sh
# Terminal 1 — the API. Bind to 0.0.0.0 so a phone can reach it.
bin/rails server -b 0.0.0.0

# Terminal 2 — the phone app
cd mobile && npx expo start
```

Then press `i` for the iOS simulator, `a` for the Android emulator, `w` for the
browser, or scan the QR code with Expo Go on a real phone. Open the **Tasks**
tab: the list is served by Rails, and adding, ticking and deleting write back to
it.

## How the app finds Rails

`localhost` means a different machine on every target, so hardcoding it breaks
something immediately. `mobile/src/lib/api.ts` instead reuses the address Metro
is already serving the JavaScript bundle from — if the phone can download JS
from `192.168.1.5:8081`, it can reach Rails at `192.168.1.5:3000`.

| Target | Resolved API URL |
|---|---|
| iOS simulator / web | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` (the emulator's alias for the host) |
| Physical device | `http://<your LAN IP>:3000` |

To point somewhere else — a different port, a tunnel, staging, or any release
build, where there is no Metro server to ask — copy `mobile/.env.example` to
`mobile/.env` and set `EXPO_PUBLIC_API_URL`.

> `EXPO_PUBLIC_*` values are inlined into the JavaScript bundle at build time.
> They are readable by anyone with the app. Never put secrets there.

## Running on a physical phone

The phone and the computer must be on the same network, and the computer's
firewall must allow inbound connections on ports 3000 and 8081.

**On WSL2 or inside Docker**, this needs one extra step, because the Linux
environment has its own virtual network adapter that your phone cannot see. From
an **administrator PowerShell** on Windows, forward both ports to WSL:

```powershell
$wsl = (wsl hostname -I).Split()[0]
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wsl
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=$wsl
New-NetFirewallRule -DisplayName "Rails + Metro" -Direction Inbound -LocalPort 3000,8081 -Protocol TCP -Action Allow
```

Then set `EXPO_PUBLIC_API_URL` to `http://<your Windows LAN IP>:3000`, since the
WSL address Metro reports is not reachable from the phone. Re-run the portproxy
commands when the WSL IP changes, which it does on reboot.

Alternatively `npx expo start --tunnel` routes the *bundle* through the
internet, avoiding the firewall entirely — but it does not tunnel your API, so
you still need `EXPO_PUBLIC_API_URL` pointing at something the phone can reach.

## The API

All endpoints live under `/api/v1` and speak JSON. `Task` is a placeholder
resource wired end to end as a working example — replace it with your real
model.

| Method | Path | |
|---|---|---|
| `GET` | `/api/v1/tasks` | list, newest first |
| `POST` | `/api/v1/tasks` | create |
| `GET` | `/api/v1/tasks/:id` | show |
| `PATCH` | `/api/v1/tasks/:id` | update |
| `DELETE` | `/api/v1/tasks/:id` | destroy |

```sh
curl localhost:3000/api/v1/tasks
curl localhost:3000/api/v1/tasks -H 'Content-Type: application/json' -d '{"task":{"title":"Try it"}}'
```

Controllers inherit from `Api::BaseController`, which is an
`ActionController::API` — no cookies, no CSRF tokens, no browser version check,
none of which apply to a phone. It turns exceptions into predictable JSON:

```jsonc
// 404
{ "error": "not_found", "message": "Couldn't find Task with 'id'=99" }

// 422 — "message" for a banner, "errors" to mark up individual fields
{ "error": "unprocessable_entity",
  "message": "Title can't be blank",
  "errors": { "title": ["can't be blank"] } }
```

CORS is configured in `config/initializers/cors.rb`. It is wide open in
development and driven by the `CORS_ORIGINS` environment variable elsewhere. It
only affects the web target; native builds are not subject to CORS.

## Tests

```sh
bin/rails test                  # Rails
bin/ci                          # everything CI runs: rubocop, brakeman, audits, tests
cd mobile && npx tsc --noEmit   # TypeScript
```

Rubocop, Brakeman and the Docker build context all skip `mobile/`, since its
`node_modules` ships Ruby CocoaPods scripts that would otherwise be linted and
scanned as if they were ours.

## Next steps

- **Authentication.** There is none yet. Every endpoint is public. A token
  scheme (`has_secure_password` plus a bearer token, or `authenticate_by`) fits
  a phone client better than cookie sessions; store the token with
  `expo-secure-store`, not `AsyncStorage`.
- **Native builds.** `npx expo start` runs inside Expo Go, which only includes
  Expo's own native modules. The moment you add a library with custom native
  code you need a development build (`npx expo run:ios` / `run:android`) and
  [EAS Build](https://docs.expo.dev/build/introduction/) for the app stores.
- **Production database.** SQLite is the default here and is genuinely fine for
  a single server, but check `config/database.yml` before scaling out.
