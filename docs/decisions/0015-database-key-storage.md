# 0015 — Database key storage and the biometric boundary

**Status:** Proposed — implemented in `mobile/src/lib/db/key.ts`, needs technical-lead sign-off
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

## Threat model

Three rows, so that signing this off means agreeing to something specific rather than endorsing a direction.

| Who | What they get | What stops them |
|---|---|---|
| Someone who finds or steals the phone, locked | Nothing. An encrypted file they cannot open. | The device lock. `WHEN_UNLOCKED_THIS_DEVICE_ONLY` also keeps the key out of any backup they could restore elsewhere. |
| Someone reading the keystore off a rooted or jailbroken device | The key, and therefore the journal. | Nothing we control. `requireAuthentication` would have raised the cost here. |
| **Someone holding the phone while it is unlocked** | **The key, and the journal.** | **Nothing in this decision.** |

The third row is the one that matters, and it is not an abstract attacker. [0004](0004-primary-user-caregiver-role.md) has no caregiver account and no role distinction — whoever is holding the phone sees the journal, deliberately. [0006](0006-excluded-field-safety-boundary.md) exists because the team already accepts that some things are too sensitive to sit on a device other people handle. This is that same person, and the honest statement is that the app does not defend against them: the biometric gate is a prompt at app open, not a property of the key, so once the app is past it the key is readable to anyone the phone is passed to.

`requireAuthentication` would have covered part of that — a fresh OS check at the key itself rather than only at the door. Only part, because a caregiver whose own fingerprint is enrolled on the phone passes that check too. That is what is being given up, and it is the piece the sign-off is really about.

## Consequences

- **The trade, stated plainly:** the key is protected by the device lock rather than bound to biometric enrollment in the secure element — the threat model above says who that leaves in. Against that we are weighing a failure mode that is silent, permanent, and triggered by something people do routinely. For a journal whose worst case is disclosure and whose *other* worst case is total loss, this is the better side of the trade — but it is a security decision and deserves the second pair of eyes [0003](0003-device-encryption-exports-backups.md) also asks for.
- `WHEN_UNLOCKED_THIS_DEVICE_ONLY` keeps the key out of iCloud/Google backups, so a restored backup on a new phone cannot decrypt a copied database file. That is the same boundary 0003 draws for exports; issue #115 still has to do the equivalent for the database file itself.
- A unit test asserts the option stays off, so switching it on means deleting a test that says why not to.
- **If this is rejected,** the alternative is `requireAuthentication` plus an onboarding line telling people that changing their biometric settings destroys the journal. That is honest, and a worse product.

## What would change the answer

Availability only has to win here because of something missing, not something permanent. [0001](0001-local-only-architecture.md) means there is no server copy, and nothing shipped yet gives users a copy of their own — so an unreadable key ends the journal, and no confidentiality gain is worth that.

The encrypted device-transfer file [0003](0003-device-encryption-exports-backups.md) scopes, and export (issue #115), change that arithmetic. Once someone holds a passphrase-protected backup, losing the key costs them what they have written since they made it rather than everything, and `requireAuthentication: true` stops being a silent data-loss bomb and becomes an ordinary trade worth taking. Revisit this record when that ships rather than inheriting it. (`WHEN_PASSCODE_SET_THIS_DEVICE_ONLY` does not come back with it: it still cannot store a key at all on the devices [0018](0018-no-device-lock-behaviour.md) is about.)

So this is correct while the device holds the only copy of the journal, and that is the basis to sign it off on — not as a permanent position on the biometric boundary.
