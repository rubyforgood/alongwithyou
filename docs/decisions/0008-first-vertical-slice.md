# 0008 — First representative vertical slice

**Status:** Decided
**Resolves:** GitHub issue "Choose the first representative vertical slice for design and development"

## Context

The brief calls for validating one full Phase 1 section end-to-end — data model through a shipped, tested, accessible screen — before building out the rest of Phase 1. This determines what a new contributor's first real ticket looks like, so it's worth deciding before recruiting rather than after.

## Decision

**Build Caregiver/Emergency Contacts first.** Name, relationship, phone, email; add/edit/delete list.

## Rationale

- It's the simplest true instance of the repeatable-entry pattern — four plain text fields, no sensitive-field exclusions to reason about (contrast [0006](0006-excluded-field-safety-boundary.md), which governs Your Information and Medical Portals), no derived calculations, no conditional logic.
- Phase 1's ticket list already calls for a **generic repeatable-entry CRUD pattern** "built once, reused everywhere" — Health Care Providers, Allergies, Chronic Conditions, Hospitalizations, Family History, and others are all variants of the same shape. Proving that pattern out on the lowest-complexity case first means the slice validates the reusable component, not just one screen.
- It touches the full stack that matters for Phase 1: the encrypted local database, the biometric-unlock app shell, the generic CRUD component, and one screen a user actually sees — without the extra decisions Your Information carries (SSN exclusion, insurance sub-fields) or Medical Portals carries (username/password exclusion).
- Its output feeds directly into the "Keep with me" emergency screen ([0005](0005-grab-and-go-emergency-access.md)), so shipping it end-to-end also produces something immediately useful, not just a technical proof.

## Consequences

- This becomes the first ticket handed to a new contributor — a good "start here" story for onboarding: small, real, and it establishes the pattern everything else in Phase 1 copies.
- The generic CRUD component ticket should be scoped and built alongside this slice, not after it — building Contacts without generalizing the pattern would mean redoing the work on the next list screen.
