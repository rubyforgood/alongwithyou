# 0016 — Development builds required; Expo Go no longer runs this app

**Status:** Proposed — follows from encrypting the database at all, but the workflow cost needs accepting explicitly
**Arises from:** building the storage foundation ([0015](0015-database-key-storage.md))

## Context

SQLCipher is a native fork of SQLite. `expo-sqlite` compiles it in only when `useSQLCipher` is set in its config plugin, which means a native rebuild, and Expo's SDK 57 documentation says so plainly: *"SQLCipher is not supported on Expo Go."*

Until now a contributor could clone the repo, run `npm start`, scan a QR code and be looking at the app in a minute. That stops being true the moment the database is encrypted.

## Decision

**Accept it: the project uses Continuous Native Generation (`npx expo prebuild`) and a development build. Expo Go is no longer a way to run this app.**

`ios/` and `android/` stay generated rather than committed — CNG regenerates them from `app.json`, which keeps configuration in one reviewable place.

## Rationale

The alternative that preserves Expo Go is application-level encryption: plain SQLite, with `expo-crypto` encrypting individual field values before they are written. It was considered and rejected.

- Every read and write would go through app code, and anything the app forgets to encrypt is stored in clear.
- Encrypted values cannot be indexed, sorted or compared by SQLite, so any list the user sorts or filters — medications by name, contacts alphabetically — has to be pulled into memory and decrypted wholesale first. Note this does **not** apply to drug search: per [0013](0013-medicine-diary-on-device-drug-search.md) that runs against `catalog.db`, which is public and deliberately unencrypted, so encryption never constrains it.
- It is a hand-rolled scheme in place of a reviewed one, protecting medical data, maintained by rotating volunteers. This is the argument that actually decides it.

SQLCipher encrypts the whole file, including indexes and the write-ahead log, and is the mechanism `architecture-plan.md` already assumed.

## Consequences

- **`useSQLCipher` is a build-wide flag, not a per-database one.** [0013](0013-medicine-diary-on-device-drug-search.md) puts two databases on the device: `journal.db` encrypted, and `catalog.db` — the public drug catalog — deliberately not, because it is public data and treating it otherwise buys nothing. Turning SQLCipher on links the whole app against it, so `catalog.db` gets opened by a SQLCipher build with no `PRAGMA key` set. Reading a plaintext file that way is ordinary SQLCipher behaviour, but Expo's documentation does not cover it and nothing here has tested it. **Verify on device before the catalog work depends on it** — issue #101 is the natural place, and it is a cheap check that would be expensive to discover late.
- **`enableFTS` must stay on.** It defaults to `true`, and 0013's search is SQLite FTS5. Expo's own config example sets `enableFTS` and `useSQLCipher` together, so there is no conflict — but an edit that switched FTS off would break the Medicine Diary while looking like a storage-layer change, which is not where anyone would think to look. Worth setting explicitly in `app.json` rather than relying on the default.
- **Contributor onboarding changes and the docs have to change with it.** `mobile/README.md` needs the prebuild/dev-client path, and the first-run cost (a native build) needs saying up front rather than discovered.
- This lands on the same people [0008](0008-first-vertical-slice.md) designed a gentle first ticket for, so the setup instructions matter more than usual.
- CI currently runs lint, typecheck and jest, none of which need a native build, so it is unaffected for now. A build job would need macOS runners for iOS.
- Anything that only ever runs in Expo Go — quick demos to non-technical stakeholders — needs a different answer, most likely a shared development build or the web landing page ([0017](0017-journal-data-is-native-only.md)).
