# 0002 — Legal/privacy basis for printable & emailed PDF export

**Status:** Research complete and decided; a plain-language privacy policy still needs to be written before ship
**Resolves:** GitHub issue "Research legal/privacy implications of printable or emailed PDF exports"
**Unblocks:** the doctor-sharing / printable-summary export ticket

## Context

Paul flagged that print/email export of medical data needed legal research before being built. This mainly concerns the printable PDF summary (medications, insurance, vitals, therapy log) that Paul proposed as the alternative to live doctor-account access (see [0001](0001-local-only-architecture.md)).

## What applies to us

- **HIPAA does not apply.** HIPAA only binds "covered entities" (healthcare providers, health plans, clearinghouses) and their contracted business associates. Along With You is neither — we're not built on behalf of a provider. This would change if we ever integrated with a provider's system directly.
- **The FTC Health Breach Notification Rule does apply.** It covers health apps not covered by HIPAA that handle identifiable health record data (updated by the FTC in 2024). If user health data is ever exposed in a breach, we may have a legal duty to notify affected users, the FTC, and possibly media.
- **State consumer health data laws likely apply**, based on where users are, not where we're based — we'll have users in multiple states as a public app. Washington's My Health My Data Act requires a standalone consumer health data privacy policy plus consent before collecting/sharing data. California's CMIA restricts using or disclosing health data for anything beyond what's needed for the person's care.
- **Bottom line:** not being a hospital doesn't exempt us from privacy law. We need a plain-language privacy policy describing what health data we collect and how export/sharing works, before the export feature ships.

## Risks specific to PDF export/email

1. Email isn't secure by default — interception, misdelivery, unencrypted storage on mail servers, forwarding by the recipient are all possible once a PDF leaves the app.
2. PDF metadata can leak information the user didn't mean to share (author name, device details, file history).
3. Printed pages are physical artifacts — left on a shared printer, in a bag, on a counter.
4. On shared/family devices, the export flow itself (generate → open → send) is a bigger exposure window than just viewing the journal in-app.

## Decision / required mitigations

- Warn the user in plain language before export/email: once it leaves the app, we can't protect it.
- Strip PDF metadata at generation time — no author name, device ID, or app internals embedded.
- Require the user to type/select the recipient manually — no pre-filled or suggested addresses, to cut misdelivery risk.
- Default the export to only what's needed for the visit, not the full journal history.
- Add a short, plain-language consumer health data privacy policy (single page) before shipping export.
- Keep export a deliberate, reviewable action — no auto-attach/auto-send.
- **Do not make PDF password protection default or required** — see [0003](0003-device-encryption-exports-backups.md) for why.

## Not legal advice

This is engineering-level research, not a legal opinion. Recommend a lawyer review the privacy policy language and breach-notification exposure before ship.
