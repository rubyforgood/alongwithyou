# 0014 — Medicine Diary (Section 2) shape: current list, dated log, or both

**Status:** Open — product call, needs a named owner
**Resolves:** Medicine Diary (Section 2) — Phase 0 of the on-device drug catalog proposal

## Context

[0011](0011-dietary-nutrition-shape.md) settled the same question for Section 8 and set the precedent: split by which parts of the content are actually episodic. Section 2 needs the same treatment before its screens are built.

This was deliberately left out of the drug-catalog technical proposal and out of [0013](0013-medicine-diary-on-device-drug-search.md). It is a product decision about what the paper journal's Section 2 actually contains, not a technical one, and it should be made by someone looking at the source material rather than inferred from an architecture document.

## The question

A medication carries two kinds of content:

- **Standing facts** — the drug, strength, dose instructions, prescriber, start date. These change rarely. A doctor skimming the PDF export ([0002](0002-pdf-export-legal-privacy.md)) wants a clean current-medications list, not something reconstructed from a log.
- **Episodic facts** — dose changes, side effects, why something was stopped or switched. These are a timeline, and the timeline is the useful part for a caregiver or a doctor.

Applying 0011's reasoning points toward **both**, the same split it landed on for diet: a current list edited in place, plus dated notes attached to it. But 0011's real lesson is that the answer comes from examining the content, not from copying the previous answer.

**Out of scope for this record:** daily adherence tracking (*did I take my 8am dose?*) is a materially larger feature than either option above — reminders, notifications, a per-dose data model — and should be decided separately rather than folded in here.

## What it blocks

Only the diary UI. Ingestion, catalog distribution, and on-device search ([0013](0013-medicine-diary-on-device-drug-search.md)) do not depend on the answer and can proceed.

Whichever shape is chosen, [0008](0008-first-vertical-slice.md) applies: the Medicine Diary uses the generic repeatable-entry CRUD pattern that Caregiver/Emergency Contacts establishes. It does not get a bespoke screen.

## What it does not change

[0012](0012-medicine-diary-drug-data-source.md) and [0013](0013-medicine-diary-on-device-drug-search.md) hold either way. The shape affects the `journal.db` schema and the screen — not where search runs, and not what the backend stores, which is nothing.
