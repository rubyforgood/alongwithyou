# 0010 — Whether the organization or its partners create accounts for users

**Status:** Decided
**Resolves:** GitHub issue "Decide whether the organization or its partners create accounts for users"

## Decision

**No accounts exist, so neither the organization nor any partner creates one.** This follows directly from [0001](0001-local-only-architecture.md) (no backend, no remote login) and [0007](0007-authentication-recovery-deletion.md) (no username/password, no signup). The app is downloaded from the App Store / Play Store and used immediately — self-serve, same as any consumer app with local-only storage. There's no signup flow to design and no provisioning process for the org or a partner clinic to run.

## Related, but different question

Whether a partner (e.g. the Dewberry Cancer Center) ever hands out the app through a special channel — a code, a link, TestFlight, enterprise distribution — is a **distribution** question, not an account-creation one. Nothing here rules that out; it just isn't the same decision. Worth its own ticket if the team wants app distribution to go through a partner rather than the public app stores.

## Consequences

Closes cleanly alongside [0007](0007-authentication-recovery-deletion.md) — both resolve to "no accounts" once [0001](0001-local-only-architecture.md) is ratified. No onboarding/signup screens to design for Phase 0.
