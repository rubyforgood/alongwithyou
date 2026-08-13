# 0015 — Database key storage and the biometric boundary

**Status:** Proposed — implemented on `feature/encrypted-storage-unlock-foundation`, needs technical-lead sign-off
**Resolves:** the key-storage half of the local-database-encryption decision that [0003](0003-device-encryption-exports-backups.md) and [0007](0007-authentication-recovery-deletion.md) both reference as living in `architecture-plan.md`

## Context

The journal database is encrypted with SQLCipher, which needs a key. Where that key lives and what protects it was never written down — `architecture-plan.md` settled "SQLCipher + biometric unlock" as a direction without specifying the mechanism. Building the storage foundation forced the question.

`expo-secure-store` offers `requireAuthentication: true`, which binds a stored value to the device's biometric in the secure element. It is the obvious way to implement "biometric unlock", and reading its documentation is what raised the problem: a value stored that way "will become inaccessible if there are changes to the user's biometric settings, such as adding a new fingerprint."

## Decision

**Store the key without `requireAuthentication`, and apply the biometric gate separately at the app shell.**

- A 256-bit CSPRNG key, hex-encoded, in Keychain/Keystore via `expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.
- The biometric prompt is a separate `expo-local-authentication` call gating the app, not a property of the key entry.
- The key is handed to SQLCipher as a raw key (`PRAGMA key = "x'...'"`) rather than a passphrase. It is already 256 bits of random, so the passphrase form's PBKDF2 pass would add startup latency and no security. This is only correct *because* of where the key comes from — a user-chosen passphrase would need the KDF.

## Rationale

Per [0001](0001-local-only-architecture.md) there is no server copy of anything a user writes. A key that becomes unreadable is therefore not an inconvenience; it is the permanent loss of someone's medical journal, with no support path that can recover it.

`requireAuthentication` puts that outcome one routine action away: adding a fingerprint because your other thumb is bandaged, re-enrolling Face ID after new glasses. [0007](0007-authentication-recovery-deletion.md) accepts "lose the phone, lose the journal" as a risk *and requires telling people about it during onboarding*. Nobody has told anyone "add a fingerprint, lose the journal", and it is not a risk a user would accept if asked.

Separating the two still delivers what 0007 actually asks for — a device-biometric lock with the OS passcode fallback — while leaving the key's survival independent of enrollment state.

## Consequences

- **The trade, stated plainly:** the key is protected by the device lock rather than bound to biometric enrollment in the secure element. Someone with an unlocked device, or with a rooted/jailbroken one and some patience, can reach it. Against that we are weighing a failure mode that is silent, permanent, and triggered by something people do routinely. For a journal whose worst case is disclosure and whose *other* worst case is total loss, this is the better side of the trade — but it is a security decision and deserves the second pair of eyes [0003](0003-device-encryption-exports-backups.md) also asks for.
- `WHEN_UNLOCKED_THIS_DEVICE_ONLY` keeps the key out of iCloud/Google backups, so a restored backup on a new phone cannot decrypt a copied database file. That is the same boundary 0003 draws for exports; issue #115 still has to do the equivalent for the database file itself.
- A unit test asserts the option stays off, so switching it on means deleting a test that says why not to.
- **If this is rejected,** the alternative is `requireAuthentication` plus an onboarding line telling people that changing their biometric settings destroys the journal. That is honest, and a worse product.
