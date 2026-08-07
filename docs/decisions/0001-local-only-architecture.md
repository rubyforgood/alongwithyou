# 0001 — Local-only architecture; no backend for journal data in MVP

**Status:** Decided
**Decided by:** Paul Smith & Jesse Berman (technical leads), per architecture-plan.md review, 7/23–8/2
**Resolves:** GitHub issues "Resolve architecture direction: Rails API + Expo, offline-capable, or local-only" and "Decide whether the product must work without a network connection"

## Context

The repo contains a working Rails 8 API + Expo mobile app talking over HTTP (`/api/v1/tasks`). A separate product brief document described "Rails JSON API consumed by Expo client" as Proposed, with "Offline behavior" listed as Open — which reads as if the network architecture were still undecided. It isn't. That brief language drifted from a decision the team already made in `architecture-plan.md`, the actual document Paul and Jesse reviewed.

## Decision

**The journal (medications, contacts, medical history, care preferences, etc.) is local-only for MVP.** No backend, no Postgres, no Rails involvement for journal data. Data lives in an encrypted local SQLite database on the patient's device (encryption decision tracked separately, not duplicated here). There is no remote caregiver login and no server holding this data in MVP.

Rails stays in the repo, scoped to non-journal purposes only: the org's website/donation page today, and potentially an *optional* future sync layer (see "Future path," below) — never the patient-facing app's medical data in MVP.

**Corollary — the product must work fully without a network connection.** Since journal data never makes a network call, there's no "offline mode" to design; there's no online mode to fall back from. This removes real scope from Phase 0's error/loading/offline-state work — offline isn't a state to design for the journal screens, it's just how the app always behaves.

## Rationale

- Matches the stated MVP principle: "the point of local-only storage is that Along with You's servers never hold this data at all, not that the app happens to work offline" (architecture-plan.md).
- Matches Paul's separately documented position of being "extremely hesitant about doctor access" as a live/connected feature, preferring a printable PDF export instead (see [0002](0002-pdf-export-legal-privacy.md)). A networked API serving live journal data would cut against that decision, not just be unrelated to it.
- The Rails API currently in the repo is a starter-kit scaffold (`Task` is explicitly a placeholder resource per `README.md`), not evidence of an actual decision to route real medical data through a network API. A PR review already found it unauthenticated, unbounded, and open to any origin in dev — acceptable for a demo, not for medications and advance directives.

## Consequences

- No offline queue, no optimistic-update/conflict-resolution logic, no "pending sync" UI state needed for MVP.
- **Dependency audit needed:** confirm no third-party SDK (crash reporting, analytics, Expo's EAS Update check) blocks app launch waiting on a network call. EAS Update in particular checks for updates on launch by default — needs to be configured non-blocking so a patient in a dead zone isn't stuck on a spinner before seeing their own medication list.
- Section 7 of `architecture-plan.md` keeps a documented future path (end-to-end encrypted sync, or simpler server-managed encryption via Rails/Postgres) open for later, if the org ever wants backup/multi-device/remote-caregiver access. Not ruled out forever — just not MVP, and not a default to drift back into without a new explicit decision.

## Open follow-up

- Write the formal ADR sign-off from both Paul and Jesse referencing this record (this file *is* that record — close the "write an ADR" backlog ticket by pointing here).
- Correct the source product brief's phase table so "Rails API — Proposed" / "Offline behavior — Open" stop reading as live questions.
