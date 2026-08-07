# 0009 — Hosting, support, incident response, and long-term maintenance ownership

**Status:** Open — needs a named owner, not a technical call
**Resolves:** GitHub issue "Decide who owns hosting, support, incident response, and long-term maintenance"

## Context

This is an organizational decision, not an engineering one — laid out here so Jesse and Paul have what's needed to bring it to Roberta and Ruby for Good's leadership, not to pre-decide it.

## What the local-only decision already narrowed

Per [0001](0001-local-only-architecture.md), there's no patient-data server in MVP — no database to back up, no uptime SLA for the core product, no patient-data breach surface on a server Along With You runs. That's a real reduction in what "hosting" has to mean here compared to a networked app. What's left to own is smaller than it would otherwise be, but not zero:

- **The org's public website / donation page** (Rails, in this same repo) — hosting, domain renewal, and whatever bill that carries.
- **App store distribution** — an Apple Developer account and a Google Play Console account, both of which cost money annually and require a named account holder. This is a common single point of failure for volunteer projects: if the one person with the login leaves, nobody can ship an update until access is recovered.
- **Security/incident contact** — if someone (a researcher, a user, anyone) reports a vulnerability or a data-handling concern, who receives that report and decides what happens next?
- **General maintenance continuity** — architecture and security posture ownership between Ruby for Good's hackathon-style sprints, called out explicitly as a risk in the team's own Open Questions doc.

## What needs a decision

- Named individual(s) — not "the team" — holding the Apple/Google developer accounts, with a documented second person as backup.
- Named security/incident contact, same backup requirement.
- Confirmation of who already owns Ruby for Good's broader web hosting, and whether this project's site/donation page rides on that existing arrangement or needs its own.
- What happens to all of the above if a current owner becomes unavailable — a short written continuity note, not a full plan.

## Why this matters before more devs join

More contributors means more surface area for "who do I ask" and more risk that undocumented tribal knowledge (who has the Apple account password, who gets pinged if something breaks) stays with one or two people. Worth a short written answer, even an informal one, before the contributor base grows past the people who already know it by default.
