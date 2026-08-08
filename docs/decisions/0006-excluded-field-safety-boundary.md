# 0006 — Excluded-field safety boundary

**Status:** Boundary is settled; needs formal named sign-off recorded
**Resolves:** GitHub issue "Approve the excluded-field safety boundary"

## Decision

The MVP explicitly excludes the following fields, even though they appear in the paper journal this app is based on:

- **Social Security numbers**
- **Medical portal passwords/secrets** (and usernames — see inconsistency below)
- **Security alarm codes**
- **Exact house key / wallet / purse locations**

Check every new feature or field suggestion against this list.

## Rationale, for the sign-off record

- **SSN:** materially bigger liability than the rest of the journal if the device is lost or compromised, and it has a legal dimension beyond device risk. Every US state's data breach notification law treats name + SSN as a "triggering" combination requiring notification, and several states require 18 months of free identity-theft protection for affected individuals when SSNs are involved. Excluding SSN entirely keeps the app out of that trigger category, not just off the digital form.
- **Medical portal passwords:** the paper journal stores these in plaintext today. Carrying that into the app — even encrypted at rest — makes it a live credential to a real medical account, a categorically different risk than journal text. A leaked password here doesn't just expose our data, it exposes whatever the portal itself guards.
- **Security alarm code / exact house key & wallet/purse location:** not medical data — home-security data traveling with a medical journal. Same device-compromise exposure as the rest, for a benefit the app doesn't need to provide.

## Known inconsistency to resolve in the same sign-off

The Phase 1 "Medical Portals" ticket already goes further than this stated boundary: it specifies "name/URL only, no login or password fields" — dropping the *username* too, not just the password. The formal boundary text above only names "passwords/secrets." Recommend extending the boundary to explicitly exclude portal usernames as well, matching what's already assumed in the Phase 1 ticket (a username without a password is low risk alone, but pairing it with portal name/URL still tells someone exactly which account to target).

## Sign-off

Needs a named approver on record — recommend Roberta Talmage (product owner) plus both technical leads (Paul Smith, Jesse Berman) — so this doesn't get re-litigated per-field as each screen gets built. Once signed off, close the "track resolution of unapproved sensitive fields" risk-tracking ticket.

## Paul
  I'm approving this as an **MVP scope decision, not a permanent architectural
  constraint.** Two sides to that:

  - Nothing here should get baked in as a structural assumption that makes it
    expensive to revisit later — no schema, encryption design, or export format
    written as though these categories can never exist.
  - Equally, no partial support and no placeholder columns "for later."
    Excluded means not collected, not stored, not in the data model today.

  We're excluding these because we don't yet have the security design to hold
  them responsibly, not because a medical journal can never hold sensitive data.
  If we build that design — the encryption work in 0003 actually shipped, a
  written threat model, a real security review — I want the option to revisit
  specific categories on the merits.

  **SSN is the exception — I'd treat it as effectively closed.** The rationale
  there isn't device risk, it's that name + SSN is a breach-notification trigger
  in every state no matter how well we encrypt it. Better engineering doesn't
  move that. Reopening it would need a legal read, not a security review.

  Portal credentials and home-security data are the ones I'd genuinely leave
  open. Both are correctly excluded now, and both are the kind of thing a
  properly designed secrets store could hold later if there's real user need.
