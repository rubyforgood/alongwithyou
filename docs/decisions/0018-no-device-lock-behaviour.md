# 0018 — Unlock behaviour on a device with no lock screen

**Status:** **Open** — product call, needs a named owner
**Arises from:** building the unlock gate ([0015](0015-database-key-storage.md))

## Context

[0007](0007-authentication-recovery-deletion.md) settled what happens when the biometric *fails*: fall back to the device passcode, which is a mechanism people already know. It was written about lockout, and it assumes there is a device lock to fall back to.

Some phones have neither a biometric nor a passcode set. There is then nothing for the app to prompt with, and 0007 has no answer for it. This is not a rare edge case in this audience — a passcode is one more thing to remember, and people who find phones difficult are exactly who this app is for.

## Decision

**None yet.** This record exists so the gap is visible rather than settled by whoever writes the code.

The current implementation explains the situation and lets the user continue. The journal is still encrypted at rest either way; the device lock is a second layer, not the only one. That is a placeholder, chosen because silently doing nothing and hard-refusing both seemed worse than saying something true, and it should not be mistaken for a decision.

## Options

- **Refuse to open until a device lock is set.** Strongest, and locks someone out of their own medical information over a phone setting they may not know how to change. Hard to square with "keep technology in a supporting role".
- **Continue, with a plain explanation.** What is built today. Honest, and leaves the app's own protection at whatever the encrypted-at-rest key gives ([0015](0015-database-key-storage.md)).
- **Prompt once, remember the answer.** Nudges without trapping. More UI, and needs a place to store the answer.
- **Continue, and offer a shortcut into the OS settings screen.** Same as above with a lower barrier to actually fixing it.

## What is needed

A named owner to pick one, in the same way [0009](0009-hosting-support-incident-ownership.md) needs one. Whoever decides should also settle whether onboarding says anything about it, since [0007](0007-authentication-recovery-deletion.md) already commits to one honest line about backup being the user's responsibility and this is adjacent to it.
