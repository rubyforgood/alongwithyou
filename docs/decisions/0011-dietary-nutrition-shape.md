# 0011 — Section 8 (Dietary & Nutrition) shape: static profile, dated log, or both

**Status:** Decided
**Resolves:** GitHub issue "Decide whether Section 8 (Dietary/Nutrition) is a static profile, a dated log, or both"

## Context

Section 8 covers diet pattern (vegetarian, vegan, gluten-free, etc.), food allergies/intolerances, foods avoided for religious/cultural/personal reasons, medical conditions affecting diet, and free-text notes. The brief left open whether this should be modeled as a single-entry profile (like Your Info) or a repeatable dated log (like Symptoms or Vitals).

## Decision

**Both** — split by which parts of the content are actually episodic.

- **Static profile** (one screen, edited in place, always showing current state): diet pattern, food allergies/intolerances, foods avoided, medical conditions affecting diet.
- **Dated notes log** (repeatable entries, same pattern as Meeting Notes / General Notes): free-text notes that track how things change over time — appetite shifts during treatment, new food aversions, anything not captured by the static fields.

## Rationale

Most of Section 8's content isn't naturally episodic. Diet pattern, allergies, and avoided foods are standing facts that change rarely — forcing a dated entry every time someone wants to record "I'm vegetarian" adds friction against the reduce-cognitive-load principle for no benefit, and it's the same reasoning that already keeps Allergies (elsewhere in the app) as a plain list rather than a log.

The free-text notes piece is different — appetite and diet genuinely evolve over a course of treatment, and a timeline is useful context for a caregiver or doctor. That's the part of Section 8 that behaves like Symptoms or Vitals, not like a profile field.

A pure dated-log approach loses a single place that shows current diet status without scrolling — which matters directly for the printable PDF export ([0002](0002-pdf-export-legal-privacy.md)): a doctor skimming the summary wants "here's their current diet profile" as a clean line, not something reconstructed from a log.

## Consequences

- Two UI patterns on one screen: a profile form section + an appended repeatable notes log, not two separate screens.
- Matches the existing Allergies pattern for the profile half, and the Meeting Notes / General Notes pattern for the log half — no new interaction pattern needs to be invented.
- Closes the "Track Section 8 classification decision" risk-tracking ticket.
