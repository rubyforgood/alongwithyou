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
| [0011](0011-dietary-nutrition-shape.md) | Section 8 (Dietary/Nutrition) shape — static profile, dated log, or both | Decided |
| [0012](0012-medicine-diary-drug-data-source.md) | Medicine Diary drug data source (RxNorm primary, openFDA secondary) | Needs formal sign-off |
| [0013](0013-medicine-diary-on-device-drug-search.md) | Medicine Diary drug search — on-device catalog, two-database split, no user data server-side | Decided by Paul; needs Jesse's sign-off |
| [0014](0014-medicine-diary-shape.md) | Section 2 (Medicine Diary) shape — current list, dated log, or both | **Open** — product call, needs a named owner |
| [0015](0015-database-key-storage.md) | Database key storage and the biometric boundary | Proposed — needs technical-lead sign-off |
| [0016](0016-development-builds-required.md) | Development builds required; Expo Go no longer runs this app | Proposed — workflow cost needs accepting |
| [0017](0017-journal-data-is-native-only.md) | Journal data is native-only; web is not a journal surface | Proposed — needs sign-off |
| [0018](0018-no-device-lock-behaviour.md) | Unlock behaviour on a device with no lock screen | **Open** — product call, needs a named owner |

## Related, not duplicated here

- Local database encryption (SQLCipher, biometric unlock) was decided in `architecture-plan.md` in the team's shared docs — the *direction* is not re-litigated here. What that document left unspecified, and what building it turned up, is now recorded: [0015](0015-database-key-storage.md) for where the key lives, [0016](0016-development-builds-required.md) and [0017](0017-journal-data-is-native-only.md) for what encrypting the database costs elsewhere.
- Full content/data model audit (all 11 paper-journal sections, phased ticket backlog) lives in the team's `project-plan-and-tickets.md` — this folder covers cross-cutting product/legal/architecture decisions, not the per-screen field list.

## Adding a new record

Copy the format of an existing file: Status, Context, Decision, Rationale, Consequences / open questions. Number sequentially. Keep it short enough that someone reads the whole thing in under two minutes — if it's getting long, it's probably two decisions, not one.
