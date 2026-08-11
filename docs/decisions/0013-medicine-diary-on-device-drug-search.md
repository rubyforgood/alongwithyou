# 0013 — Medicine Diary drug search: on-device catalog, no user data server-side

**Status:** Decided by Paul Smith (technical lead), 2026-08-11 — needs Jesse Berman's sign-off before final
**Resolves:** Medicine Diary (Section 2) — Phase 0 of the on-device drug catalog proposal

## Context

Given a drug data source ([0012](0012-medicine-diary-drug-data-source.md)), the obvious design is: the phone sends what the user is typing to Rails, Rails searches, Rails returns matches. The original brief framed it that way — a server-side search engine powering autocomplete — and separately asked for a backup copy of user medication lists in the backend database.

Both needed an explicit decision, because both put patient data on the org's servers: the second directly, the first through query logs.

## Decision

Three things, which only work together:

**1. The drug catalog lives on the device and is searched there.** The backend is a build-time catalog publisher, not a query-time search service. A weekly job pulls the public catalog from NLM/FDA, builds a SQLite FTS5 index, and publishes versioned snapshots. The app ships with a snapshot and updates it in the background, non-blocking.

**2. Two databases on the device, and the split is a security boundary rather than an optimisation.**

| | `catalog.db` | `journal.db` |
|---|---|---|
| Contents | Public FDA/NLM drug data | The patient's medication records |
| Encryption | None needed — it is public | SQLCipher, biometric-gated |
| Lifecycle | Read-only, replaceable, disposable | The patient's own data |
| OS auto-backup | Fine | **Excluded** per [0003](0003-device-encryption-exports-backups.md) |
| Leaves the device | Arrives only | **Never** |

They are joined in memory, on the device, at render time. Never on a server.

**3. No endpoint that accepts a user-typed drug query may exist, and no user medication data is stored server-side.** On any platform, for any client, with no exception route.

## Rationale

- Every autocomplete keystroke sent to a server is a disclosure of someone's medication list. Query logs, access logs, and APM traces would reconstruct a patient's prescriptions without any *data* ever being *stored*. That defeats what [0001](0001-local-only-architecture.md) is actually for: *"Along with You's servers never hold this data at all, not that the app happens to work offline."*
- This is only affordable because the catalog is public and small. Measured on the real corpus: the complete catalog with a full-text index is **5.08 MB**, and a search returns in **0.06–0.11 ms**. That fits on a phone with room to spare.
- On-device search satisfies 0001's offline corollary for free. There is no offline mode to design because there is no online mode to fall back from.
- **It adds no new runtime infrastructure.** No Elasticsearch, no Meilisearch, no Postgres — SQLite FTS5 is already a dependency, and the same index format runs unchanged on the server and on the phone. That matters directly while [0009](0009-hosting-support-incident-ownership.md) is still Open with no named operations owner: adding a search cluster to a project where nobody owns ops would be irresponsible.
- A user's device never calls NLM or FDA, so their rate limits stop being a design constraint.

**On the server-side backup specifically.** It contradicts [0001](0001-local-only-architecture.md) (the journal is local-only, with medications named explicitly), [0003](0003-device-encryption-exports-backups.md) (backup is device-to-device *"rather than something meant to be emailed or stored elsewhere"*), and [0007](0007-authentication-recovery-deletion.md) (no server copy, therefore no server-side deletion path). It implicates [0004](0004-primary-user-caregiver-role.md) too, since any backup needs *some* identity, which reopens the no-accounts decision. And it would make the org a breach-notification subject under the FTC Health Breach Notification Rule ([0002](0002-pdf-export-legal-privacy.md)) for the first time, even holding only ciphertext.

Paul's condition on 0001 keeps cloud backup *"deferred, not permanently ruled out."* This record does not reverse that. It says the Medicine Diary ships without it, and that reopening it needs its own record and a legal read — not a line item inside an integration spec.

## Consequences

- **A lost or broken phone means a lost Medicine Diary**, unless the user has made their own encrypted device-to-device backup. Not a new risk — [0003](0003-device-encryption-exports-backups.md) and [0007](0007-authentication-recovery-deletion.md) already accept it explicitly — but Section 2 is where it will hurt most, so the onboarding copy 0007 already calls for needs to be honest and specific about medications.
- **Free-text entry always works.** `rxcui` is nullable. A drug that is not in the catalog is still recordable, per [0012](0012-medicine-diary-drug-data-source.md).
- **The user's record is denormalised at selection time.** Display name, dosage form, and strength are copied into `journal.db` when a drug is picked — no foreign key to the catalog, which is a separate and replaceable file. If a drug is withdrawn and vanishes from next week's catalog, the record still reads correctly. A patient's record of what they took must not depend on a public catalog they do not control.
- **Catalog update failures are silent.** A stale catalog is fully functional; surfacing an error would train users to ignore warnings.
- **One invariant a reviewer can check on every PR:** no request may carry a drug name, and no request may contain both a user identifier and a drug identifier. A PR adding `GET /api/v1/drugs?q=...` *just for the web app* violates this record — and it will look reasonable in review, because no table is being written to. That is why the rule is absolute rather than case-by-case. A web client that needs drug search downloads the same public catalog and searches it client-side.
- Bundling the catalog grows the app by an estimated 8–15 MB. Above roughly 20 MB, download on first run with a skip option instead.
- Ingestion tests run against recorded fixtures. **CI must never call the government APIs.**
- [0006](0006-excluded-field-safety-boundary.md) was checked against every proposed field — RXCUI, drug names, dosage form, strength, prescriber, dates. None fall in the excluded set, and per the standing instruction on 0006 there are no placeholder columns for later.

## Approval

Paul Smith approved the two-database architecture on 2026-08-11: the public catalog on one side, the patient's encrypted journal on the other, joined only on the device — no medication search over the internet, and none of the user's information stored online.

That approval covers the architecture recorded here. Following the pattern set in [0001](0001-local-only-architecture.md), Jesse Berman's sign-off is still outstanding before the status is final.

## Open follow-up

- Jesse's sign-off.
- The Medicine Diary's shape — static list, dated log, or both — is deliberately not decided here. It is a product call, tracked in [0014](0014-medicine-diary-shape.md), and it blocks the diary UI but not ingestion, distribution, or search.
