# 0017 — Journal data is native-only; web is not a journal surface

**Status:** Proposed — needs sign-off
**Arises from:** building the storage foundation ([0015](0015-database-key-storage.md))

## Context

The app builds for web: `react-native-web`, a static export target, `.web.tsx` variants of several components, and a landing page that already exists. SQLCipher does not build for web — Expo's documentation lists it for Android, iOS and macOS only.

So the encrypted database cannot exist in the browser, and something has to give.

## Decision

**The journal database refuses to open on web, and web stays the landing and marketing surface.** No unencrypted fallback.

The unlock gate passes web traffic straight through, since gating a marketing page protects nothing.

## Rationale

The tempting move is to fall back to plain `expo-sqlite`, which does have a web build. That would mean the web build quietly writing an unencrypted medical journal into browser storage — on whatever computer someone happened to open it on, quite possibly a shared or library machine.

The whole basis of [0001](0001-local-only-architecture.md) is that this data stays under the user's control and the org never holds it. A silent downgrade from "encrypted" to "not encrypted", on a platform nobody was told behaves differently, makes that promise untrue in exactly the way nobody would notice until it mattered. Failing loudly is better than a fallback that is wrong.

## Consequences

- The web build serves the landing page and nothing that touches journal data. Any screen that reads the journal will throw there rather than render, which is intentional — but it does mean `npm run web` is not a preview of the app, and contributors need to know that.
- **This is about the journal, not about databases in general.** [0013](0013-medicine-diary-on-device-drug-search.md) explicitly contemplates a web client downloading the public drug catalog and searching it client-side, and nothing here rules that out: `catalog.db` is public, unencrypted, and has no reason to be platform-gated. The line is drawn around patient data, not around `expo-sqlite`.
- This makes the web target genuinely useful for one thing: demoing the product to stakeholders without a development build ([0016](0016-development-builds-required.md)).
- If browser access to the journal is ever wanted, it needs its own decision and its own mechanism. It is not a matter of removing a platform check.
- The "grab and go" emergency access in [0005](0005-grab-and-go-emergency-access.md) is a phone-in-hand scenario, so nothing in it depends on web.
