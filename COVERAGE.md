# PRAMAAN — Coverage against SIH26261 and USP

**Scope reminder:** this is a *frontend-only* prototype for a Vercel demo. Everything marked ✅ works in the browser on synthetic data; anything that needs a real AICTE system, issuing-authority API, OCR engine or computer-vision model is marked 🟡 (simulated, labelled in the UI) or ❌ (not built). Nothing is presented as a real integration.

Legend: ✅ covered · 🟡 covered as a labelled simulation / partial · ❌ not covered

---

## 1. Objectives

| # | Objective from the problem statement | Status | How the prototype covers it |
| --- | --- | --- | --- |
| 1 | Identify missing, incomplete, expired or inconsistent information/documents at application stage | ✅ | Category checklists with mandatory/optional rules; Gate 1 blocks submission when mandatory documents are missing; expiry rule (R-FIRE-01) and built-up-area / faculty-count / invoice-arithmetic rules produce findings. |
| 2 | Reduce manual checking by reusing records already in AICTE systems | 🟡 | "AICTE records" is a *simulated adapter* over seeded data (faculty, invoices, institutions). No real AICTE data is reached. |
| 3 | Detect document alteration, duplication, anomalies | 🟡 | Real: SHA-256 fingerprint comparison across stored documents, repeated invoice numbers, duplicate-faculty candidates from seeded records. Simulated (labelled): hidden-text layer, structural change, perceptual-hash photo duplicates, blur/quality. |
| 4 | Verify through issuing-authority portals/APIs/QR/digital signatures | 🟡 | Source-verification stage queries simulated DigiLocker, CCA India, AICTE, NAAC/NBA, state registry adapters and shows status + strength L1–L4. A QR is *not* treated as proof; a timeout is UNAVAILABLE, never MISMATCH. No real call is made. |
| 5 | Check infrastructure-related evidence against configurable requirements | 🟡 | Built-up area vs sanctioned plan, invoice arithmetic, equipment invoices tab. **No** photo/video/floor-plan computer-vision module (see gaps). |
| 6 | Transparent, traceable, explainable results | ✅ | Every finding shows rule + handbook clause, evidence list, page reference, confidence, source, verification strength, suggested action, decision and reason; hash-chained audit log. |

## 2. Key functional requirements

### 2.1 Intelligent application and document validation
| Requirement | Status | Notes |
| --- | --- | --- |
| Identify application category → applicable checklist | ✅ | New Institution / Extension of Approval / Increase in Intake, each with its own checklist, handbook clauses and accepted formats; admin can toggle mandatory/optional or add items. |
| Retrieve records from authorised AICTE systems | 🟡 | Simulated. New **AICTE records** tab cross-checks previous EoA, approved intake, TER payment, deficiency status, affidavits and NOCs against the application (fictional, deterministic records). |
| OCR + classification + extraction | ✅ / 🟡 | **Real in-browser OCR** (Tesseract.js, self-hosted so it runs on Vercel) and PDF text-layer extraction (pdf.js) for uploaded files: expiry, certificate no., institution, area, faculty count with confidence; Gate 2 for <80%. Seeded sample documents use sample extraction. Classification is implied by checklist slot. |
| Missing fields / incomplete / expired / inconsistent | ✅ | See Objective 1. |
| Structured validation report | ✅ | "Export validation report" (officer and institution) downloads a standalone HTML report: documents, findings with evidence, records cross-check, infrastructure, audit trail. |
| Rectification where permitted | ✅ | Officer-approved notice → institution replaces documents → resubmit → re-check only changed documents → version comparison. |

### 2.2 Anomaly and potential-forgery detection
| Requirement | Status | Notes |
| --- | --- | --- |
| Indicators: alterations, duplicates, metadata, identifiers, dates | ✅ / 🟡 | **Real on uploaded PDFs/images:** metadata (producer, created vs modified), hidden/off-page text, incremental updates, scripts, blur score, expiry. Real on stored data: SHA-256 duplicates, invoice arithmetic, repeated identifiers. Perceptual-hash photo duplicates stay seeded. |
| Each flag has evidence and reason | ✅ | Evidence bullets + rule + page on every finding. |
| Preliminary indicators, not proof of forgery | ✅ | Neutral wording ("unusual structure", "potential duplicate"); duplicates stay *candidates* until an officer decides. |

### 2.3 Verification through original issuing authorities
| Requirement | Status | Notes |
| --- | --- | --- |
| Compare submitted details with source response; record source, timestamp, result | 🟡 | Source, result and strength shown in the pipeline and findings; actions are timestamped in the audit log. Responses are simulated and labelled "SIMULATED SOURCE RESPONSE". |
| Statuses: verified, mismatch, expired, pending, source unavailable, manual review | ✅ | VERIFIED, MISMATCH, EXPIRED, NOT_FOUND, UNAVAILABLE, MANUAL_REQUIRED, PENDING — used consistently. |
| Route inconclusive cases to manual confirmation | ✅ | MANUAL_REQUIRED / UNAVAILABLE findings go to the officer queue; dismissal after manual check records strength **L5**. |

### 2.4 Regulatory and infrastructure compliance assistance
| Requirement | Status | Notes |
| --- | --- | --- |
| Configurable checklists derived from the Handbook | 🟡 | Checklists editable; rulesets have two numeric parameters (expiry window, faculty ratio) and a DRAFT→PREVIEWED→APPROVED→ACTIVE lifecycle with impact preview. There is no free-form rule editor. |
| Review photos, floor plans, certificates | 🟡 | Infrastructure tab checks declared classroom/lab/library figures against editable thresholds, flags missing floor plan/photos, and shows a labelled simulated image check. |
| Computer vision to flag discrepancies / inspection need | 🟡 | No real CV model; an advisory "physical inspection may be warranted" flag is derived from shortfalls and missing evidence. |
| Findings advisory, subject to official review | ✅ | No automatic approve/reject anywhere. |

### 2.5 Dashboard, alerts, audit trail
| Requirement | Status | Notes |
| --- | --- | --- |
| Application-wise dashboard: status, deficiencies, unresolved items | ✅ | Institution dashboard, officer dashboard, filterable work queue, review workspace. |
| Automated alerts | 🟡 | In-app notification store (verification done, rectification, rescan, expiry, proof slip). Messaging is a simulator; no email/SMS/WhatsApp. |
| Audit trail of rules, records, source responses, actions | ✅ | Append-only hash-chained log with a verify button (tamper *evidence*, not tamper-proofing). |

## 3. Expected deliverables

| Deliverable | Status |
| --- | --- |
| Functional prototype designed for integration | ✅ (clean store/adapter boundaries; seed data and source adapters are the swap points) |
| Category-based checklists + configurable rules | ✅ / 🟡 |
| OCR classification, extraction, completeness checks | 🟡 simulated |
| Cross-document and institutional-record consistency, evidence-linked flags | 🟡 (several real checks on seeded data) |
| Issuing-authority verification workflow | 🟡 simulated adapters |
| Compliance module for documentary + infrastructure evidence | 🟡 documentary yes, infrastructure CV no |
| Dashboard: status, deficiencies, outcomes, pending, audit | ✅ |
| Role-based access, secure handling, human review before adverse action | 🟡 — roles and six human gates enforced in the client state layer (demonstration only, **not** production security) |

## 4. Essential safeguards

| Safeguard | Status | Notes |
| --- | --- | --- |
| Configurable to Handbook/regulations | 🟡 | Checklists, ruleset parameters, ruleset approval workflow. |
| Authorised, role-based access; no bypass of access controls | 🟡 | Five roles; institution users only see their own institution's applications. Client-side only. Adapters are explicit, labelled and make no network calls. |
| Data protection, access logging, retention | 🟡 | Synthetic data only; files never leave the browser; login/actions logged. **No retention policy or encryption** (no backend). |
| Explainable, evidence-backed AI flags | ✅ | |
| AI = decision support; final decision with authorities | ✅ | Gates 3–5 stop at "recommendation"; proof slip states "not an official AICTE approval". |

## 5. Evaluation metrics mentioned in the problem statement

| Metric | Status |
| --- | --- |
| Extraction accuracy / anomaly-detection performance | 🟡 | **Admin → Evaluation** measures real extraction accuracy and hidden-text / edit-detection precision & recall over a small labelled sample set (authored by us — demonstrates the method, not production accuracy). |
| Validation accuracy / discrepancy reliability | 🟡 "Check accuracy" page shows how often officers upheld each check — a demo of the *mechanism*, tiny sample |
| Source-verification success rate | 🟡 | One real live lookup (India Post PIN directory) with UNAVAILABLE handling; other sources are simulated. |
| Average verification time | 🟡 officer dashboard (demo values) |
| Alert timeliness | 🟡 notifications with timestamps |
| Manual-effort reduction | ❌ not measured |

---

## 5b. Mentor feedback addressed

| Feedback | Status |
| --- | --- |
| Image enhancement for lab / classroom infrastructure | ✅ In-browser enhancement with before/after and measured gains |
| Explainable AI for why an application was rejected, with error summary | ✅ AI explanation panel (paragraph + points + error summary + score factors) and report |
| Login-first access, officer sees accept / reject | ✅ Email + password sign-in; officer queue shows accept / reject |
| SDG alignment | ✅ SDG 4, 9 and 16 shown on landing, explanation and report |

## 6. Known gaps worth closing (suggested order)

1. ~~Infrastructure evidence module~~ (done — simulated image check, real threshold comparison) — — a tab where labs/classrooms/library photos and floor plans are checked against configurable minimums (area per student, lab count), with a clearly labelled simulated image-quality/room-detection result and an "inspection recommended" flag.
2. ~~AICTE records panel~~ (done) — — previous EoA status, approved programmes/intake, TER payment, deficiency status, affidavits and NOCs as seeded record types, shown side by side with application fields and cross-checked.
3. ~~Exportable validation report~~ (done) — (print/HTML) per application.
4. **Source-response log** — a table of every simulated query with source, timestamp, status.
5. **Alert rules screen** — configure which events raise alerts and to whom.
6. Evaluation page with the metrics above computed over a labelled synthetic test set.

---

## 7. Unique selling points

1. **Verification you can watch.** An eight-stage animated pipeline shows exactly which check is running, what it found and how sure it is — not a spinner. Pause, skip, replay.
2. **Honesty by design.** Every simulated item is tagged (`SIMULATED SOURCE RESPONSE`, `SIMULATED FORENSIC RESULT`, …). A timeout is *unavailable*, a missing record is *not found*, a duplicate is a *candidate* — never a verdict of forgery.
3. **Six enforced human gates.** Submission, uncertain-value confirmation, finding decisions (dismiss needs a reason), notice approval, recommendation (blocked while high-severity findings remain), ruleset activation. No AI approve/reject exists.
4. **Verification-strength ladder (L1–L5).** Source evidence is graded from issuer-fetched documents down to manual officer verification, so officers see *how strong* each "verified" is.
5. **Evidence-linked findings.** Rule, handbook clause, page, extracted value, confidence, source and suggested fix on one card, with highlighted regions on the document preview.
6. **Closed rectification loop.** Officer-approved notice → institution replaces a document → only that document is re-checked → version comparison → findings auto-resolve into officer review.
7. **Tamper-evident audit + shareable proof slip.** Hash-chained audit log with one-click verification; QR proof slips with a public verification page that states what it does *not* prove.
8. **Configurable by design.** Checklists, rulesets (draft → preview impact → approve → activate) and source adapters are data-driven, mirroring how Handbook changes arrive every year.
9. **Zero-infrastructure demo.** Static Vite app, no backend or keys — deploys to Vercel in minutes, fully reproducible with seeded data and a reset button.
