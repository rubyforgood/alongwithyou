# 0005 — What "grab and go" access means digitally

**Status:** Decided
**Resolves:** GitHub issue "Define what 'grab and go' access means digitally"

## Context

Two different scenarios were being bundled into one screen design question. They have different security requirements, and one of them is already solved by the phone's OS.

## Scenario A — true emergency, patient can't unlock the phone

Unconscious or incapacitated patient, first responder has the device. **iOS Medical ID** and **Android's Emergency Information** are built exactly for this:

- **iOS:** reachable from the lock screen with no passcode/Face ID, via the Emergency button (older iPhones) or the Medical ID slider from the SOS screen (iPhone X+), if the user has "Show When Locked" enabled.
- **Android:** Settings → Safety & emergency → Medical information, shown on the lock screen without unlocking if "Show when locked" is on. Shows blood type, allergies, medications, conditions, emergency contacts.

Both are OS-maintained and what first responders are actually trained to check.

## Scenario B — patient or caregiver wants their own info fast

Not an emergency — a pharmacy counter, a waiting room. Doesn't need to bypass the lock; needs to be the first thing visible after normal biometric unlock, not buried in navigation.

## Decision

- **Do not build a custom pre-unlock screen.** Add a short onboarding nudge pointing users to set up their phone's built-in Medical ID / Emergency Information — the right tool for the true unconscious-emergency case, zero build cost, already what EMTs check.
- **Build "Keep with me" as the default landing screen immediately after biometric unlock.** Full protection, no separate credential, satisfies the "fast access for planned use" case.
- **No separate limited credential** (a "lighter" PIN). Adds a second thing to remember and a second flow to build, for a case the OS already covers better.

Reachable **after** normal unlock, as the first screen — not before, not via a separate credential.
