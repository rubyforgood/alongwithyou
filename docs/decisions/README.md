# Architecture & Product Decisions

This folder is a lightweight decision log (ADR-style) for choices that aren't obvious from reading the code, and that a new volunteer contributor would otherwise have to reconstruct from old GitHub threads. Given the team's rotating-contributor model, the goal is: if you're new here, read this folder before you read the code.

Each record has a status. **Decided** means treat it as settled — don't re-litigate it in a PR review, raise a new ticket if you think it's genuinely wrong. **Open** means it still needs a named owner to sign off.

| # | Decision | Status |
|---|---|---|
| [0001](0001-local-only-architecture.md) | Local-only architecture; no backend for journal data in MVP | Decided |
| [0002](0002-pdf-export-legal-privacy.md) | Legal/privacy basis for printable & emailed PDF export | Decided (research complete; policy copy still needed) |
| [0003](0003-device-encryption-exports-backups.md) | Device-level encryption for exports, backups, and OS auto-backup | Decided (implementation not yet built) |
| [0004](0004-primary-user-caregiver-role.md) | Primary MVP user and caregiver role | Decided, with open sub-questions |
| [0005](0005-grab-and-go-emergency-access.md) | What "grab and go" access means digitally | Decided |
| [0006](0006-excluded-field-safety-boundary.md) | Excluded-field safety boundary (SSN, portal passwords, alarm code, key/wallet location) | Needs formal sign-off |
| [0007](0007-authentication-recovery-deletion.md) | Authentication, account recovery, and data-deletion behavior | Decided |
| [0008](0008-first-vertical-slice.md) | First representative vertical slice (Caregiver/Emergency Contacts) | Decided |
| [0009](0009-hosting-support-incident-ownership.md) | Hosting, support, incident response, and long-term maintenance ownership | **Open** — needs a named owner from leadership, not a technical decision |
| [0010](0010-account-creation.md) | Whether the org or partners create accounts for users | Decided |

## Related, not duplicated here

- Local database encryption (SQLCipher, biometric unlock) was decided separately and lives in `architecture-plan.md` in the team's shared docs — not repeated here since it's a separate decision from what this folder covers (data *leaving* the device vs. data at rest).
- Full content/data model audit (all 11 paper-journal sections, phased ticket backlog) lives in the team's `project-plan-and-tickets.md` — this folder covers cross-cutting product/legal/architecture decisions, not the per-screen field list.

## Adding a new record

Copy the format of an existing file: Status, Context, Decision, Rationale, Consequences / open questions. Number sequentially. Keep it short enough that someone reads the whole thing in under two minutes — if it's getting long, it's probably two decisions, not one.
