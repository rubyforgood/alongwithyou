# 0004 — Primary MVP user and caregiver role

**Status:** Decided, with open sub-questions
**Resolves:** GitHub issue "Identify the primary MVP user and any caregiver role"

## Decision

**Single device, single shared journal, no caregiver account or role distinction in MVP.** Per `architecture-plan.md`'s guiding constraints: "The product is a personal journal a patient keeps on their own device. A caretaker or doctor views it in person, over the patient's shoulder or by being handed the phone, not through a remote account." Combined with "no remote caregiver login and no server in the MVP" ([0001](0001-local-only-architecture.md)), this means: whoever holds the patient's phone — patient or caregiver — sees the same journal, the same way. There is no separate caregiver account, role, or permission tier.

## Still open

- **Does a caregiver ever use their own device instead of the patient's?** E.g. a patient too impaired to operate a phone at all, where the caregiver is functionally the sole user, on their own hardware. The current model assumes one journal lives on one shared device — it doesn't address a caregiver-only user who never touches the patient's phone. Needs a decision if this scenario is in scope for MVP.
- **Tone/pronoun handling in copy.** Since either a patient or caregiver could be filling in fields, "your medications" may read oddly for a caregiver typing on someone else's behalf. Recommend neutral phrasing ("their," "the patient's") rather than assuming "you" is always the patient — decide once, apply everywhere, rather than per-screen.
- **Multi-patient use is out of scope.** Nothing in the docs suggests a caregiver should manage more than one person's journal (e.g. a professional caregiver, or someone caring for two family members) — worth stating explicitly as out of scope for MVP rather than leaving it merely unaddressed.

## Why this matters for future screens

Any screen design that assumes "the user" is always the patient (or always the caregiver) is making an assumption this record explicitly does not support. Default to phrasing and flows that work regardless of who's holding the phone.
