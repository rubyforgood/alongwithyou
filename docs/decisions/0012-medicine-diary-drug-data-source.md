# 0012 — Medicine Diary drug data source: RxNorm primary, openFDA secondary

**Status:** Needs formal sign-off from both technical leads
**Resolves:** Medicine Diary (Section 2) — Phase 0 of the on-device drug catalog proposal

## Context

The Medicine Diary (Section 2 of the paper journal) has no prior decision record and no code. As things stand, someone adding a medicine would free-type it, which produces misspelled, non-normalised drug names. That degrades the one output that matters most — the printable PDF a doctor reads ([0002](0002-pdf-export-legal-privacy.md)). *Lipator 20mg* in a medication list is a patient-safety problem, not a cosmetic one.

Letting people pick from an official list fixes that, which means choosing a source. Four free US federal sources were evaluated live against their real endpoints on 2026-08-11.

## Decision

**RxNorm / RxNav (NLM) is the primary source. The openFDA NDC Directory (FDA) is secondary, used only for enrichment.**

- RxNorm supplies the searchable corpus and the stable `RXCUI` identifier for each drug concept.
- openFDA supplies dosage form, route, and marketed brand names, joined to RxNorm through its `openfda.rxcui` array.
- **DailyMed SPL — rejected.** Full prescribing-label text, far more than this needs.
- **NIH Pillbox — do not use.** Retired January 2021.

## Rationale

- RxNorm exists specifically to *normalise* drug names — mapping brand to generic and assigning a stable identifier. That is precisely the Medicine Diary's problem, not a near-miss for it.
- Two RxNav endpoints each return the entire corpus in a single request, in under two seconds: `displaynames.json` (28,084 names, 753 KB) and `RxTerms/allconcepts.json` (21,186 concepts, 2.4 MB). Bulk availability is what makes the on-device architecture in [0013](0013-medicine-diary-on-device-drug-search.md) possible at all — without it we would be making per-user network calls, which that record forbids.
- openFDA's NDC bulk export is 136,869 records in one 26.75 MB zip, so enrichment also needs no per-item API calls. Its records are mostly packaging detail, which is why it enriches rather than drives the search corpus.
- Both are free, need no API key, and carry no commercial licence.

## Consequences

- **NLM attribution is a licence condition, not a courtesy.** NLM requires a specific attribution statement in any application using their data. It belongs in the app's About screen and in the PDF export footer ([0002](0002-pdf-export-legal-privacy.md)). Treat the ticket as a release blocker and record the exact required string in it.
- **openFDA's own disclaimer has to surface in the UI:** do not rely on openFDA to make decisions regarding medical care, and assume all results are unvalidated. This reinforces the not-medical-advice line already asserted on the landing screen.
- **Both sources are US-only.** Someone outside the US falls back to free-text entry — it works, but unassisted. If the org ever serves non-US users this decision is wrong for them and needs revisiting. Stated now rather than discovered later.
- **Free text must always remain available.** Compounded medications, supplements, non-US drugs, and clinical-trial agents are not in RxNorm. The catalog assists; it must never gate what someone can record about their own treatment.
- NLM's published limit is 20 requests/second per IP, and NLM recommends caching results for 12–24 hours. The weekly bulk ingestion in [0013](0013-medicine-diary-on-device-drug-search.md) uses roughly four requests per week and caches for a week — comfortably inside both.
