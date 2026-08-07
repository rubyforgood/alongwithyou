# 0007 — Authentication, account recovery, and data-deletion behavior

**Status:** Decided
**Resolves:** GitHub issue "Confirm authentication, account recovery, and data-deletion behavior"

## Context

This reads like an account-system question, but per [0001](0001-local-only-architecture.md) (no backend, no remote login) and [0004](0004-primary-user-caregiver-role.md) (no caregiver account/role), there is no account system to design. What's actually being asked: what gates access to the app on-device, what happens if that gate fails, and what "deleting your data" means with no server involved.

## Decision

**Authentication:** No username/password, no signup, no server-side session. App-level lock via the device's own biometric (Face ID/Touch ID/fingerprint) with the OS's built-in passcode fallback, backed by Keychain (iOS) / Keystore (Android) — this is the local-database-encryption/biometric-unlock decision already made in `architecture-plan.md`, referenced here rather than re-decided.

**Account recovery:** Doesn't apply in the traditional sense — there's no password to reset. The real scenario is lockout: biometric fails or is unavailable. Use the OS's native fallback (device passcode) rather than building a custom in-app PIN-reset flow — this is what "keep technology in a supporting role" means in practice, and it's a well-tested mechanism users already understand from every other app on their phone.

If someone loses the device entirely without ever having made an encrypted backup ([0003](0003-device-encryption-exports-backups.md)), the journal is unrecoverable. That's an accepted risk, consistent with 0003's stance on forgotten passphrases — not something to engineer around, but something to say plainly during onboarding: *"this stays on your phone — back it up if you want a copy that survives losing the phone."*

**Data deletion:** No server-side deletion process is needed, because there's no server copy. Build an explicit in-app "Delete all my data" action that wipes the local encrypted database immediately, in addition to what a normal app uninstall already does implicitly. Explicit and discoverable beats relying on someone knowing to uninstall the app — matches the plain-language, user-control principle and directly satisfies the MVP exit criteria checklist item on documented deletion behavior.

## Consequences

- No auth backend to build, test, or secure — this scope was already effectively closed by [0001](0001-local-only-architecture.md); this record just makes it explicit for the specific auth/recovery/deletion questions the brief raised separately.
- One small feature to add: an in-app "Delete all data" control, not just relying on uninstall.
- Onboarding copy needs one honest line about backup being the user's responsibility if they want loss-resilience beyond the device itself.
