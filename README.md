# PRAMAAN

**Handbook in, evidence out, officer decides.**

PRAMAAN is a **frontend-only prototype** of an AI-assisted application validation and document verification platform for AICTE approvals (Smart India Hackathon problem statement SIH26261).

> ⚠️ **Prototype notice.** There is no backend, no database server and no API. Authentication, permissions, OCR, document forensics, official-source responses and proof slips are all **simulated in the browser** with synthetic data. PRAMAAN is not an official AICTE system and nothing here is an AICTE approval.

## Features

- **Landing page** with a 3D, mouse-reactive pipeline illustration (clearly labelled illustrative).
- See [COVERAGE.md](COVERAGE.md) for a requirement-by-requirement comparison with SIH26261 and the USPs.
- **Institution Portal** — dashboard (with charts), new application (3 types, dynamic checklists), drag-and-drop/browse uploads with real local validation, SHA-256 fingerprinting and PDF page counting, application details, rectification & re-upload with version comparison, proof slips, notifications (messaging simulator).
- **Animated 8-stage verification pipeline** — ingestion, quality, OCR/extraction, handbook compliance, forensics, official sources, cross-college checks, findings generation. Live activity feed, pause / skip / restart, replay of earlier runs. Every simulated item carries a label (`SIMULATED CHECK`, `SIMULATED SOURCE RESPONSE`, `SIMULATED FORENSIC RESULT`, …).
- **AICTE Officer Console** — dashboard, filterable/sortable work queue, split-screen review workspace (documents + preview + extracted-field highlighting on the left; Overview / Documents / Verification / Findings / Faculty / Infrastructure / Version comparison / Decisions / Audit history on the right), finding decisions, notices, senior recommendation, inspection planner (advisory).
- **Administration** — rulesets (DRAFT → PREVIEWED → APPROVED → ACTIVE), checklist management, demo users, source-adapter status, check-accuracy view, hash-chained audit log, demo-data reset.
- **Proof slips** with QR codes and a **public verification page** (`/verify/:id`).
- Soft-extruded (neumorphic) spatial UI with light (default) and dark themes, responsive layouts, toasts, confirmation dialogs, skeleton/empty/error states.

## Human-in-the-loop gates

Enforced in the shared state layer (`src/lib/store.ts`), not just the UI. *(This is a client-side demonstration of workflow rules — not production security.)*

| Gate | Rule |
| --- | --- |
| 1 | A draft becomes submitted only via an explicit submit action; all mandatory documents must be present. |
| 2 | Low-confidence (<80%) extracted values must be confirmed before dependent findings can be decided. |
| 3 | Findings need an officer disposition; **dismissal requires a reason**. |
| 4 | Notices must be approved by an officer before being marked ready for delivery (no message is actually sent). |
| 5 | A senior officer cannot record a recommendation while **high-severity findings remain unresolved**. |
| 6 | Rulesets must be previewed, approved, then activated — administrators only. |

AI suggests. The authorized officer decides. Nothing is ever approved or rejected automatically.

## Verification strength levels

`L1` Issuer document via DigiLocker · `L2` Signature chain validated · `L3` QR/reference on an allow-listed domain · `L4` Matched to AICTE/NAAC/NBA record · `L5` Manual officer verification. In this prototype L1–L4 values are always shown as **simulated**; L5 is recorded when an officer dismisses a finding after manual review.

## What is real vs. simulated

| Real (computed in your browser) | Simulated |
| --- | --- |
| File type / size validation, SHA-256 fingerprints, image dimensions | Extraction for the seeded sample documents ("Sample" button) |
| **Real OCR** (Tesseract.js, self-hosted) and **PDF text-layer extraction** (pdf.js) of uploaded files: expiry date, certificate number, institution, area, faculty count | |
| **Real PDF forensics**: producer/creator/created/modified metadata, hidden or off-page text, incremental-update (`%%EOF`) count, script/encryption flags, blur score | Perceptual-hash photo duplicates |
| Invoice arithmetic, repeated invoice numbers, fingerprint comparison across stored documents | Source lookups, cross-college candidates over seeded data |
| Workflow state transitions, gates, audit hash chain, proof-record integrity digest | DigiLocker, CCA India, AICTE/NAAC/NBA, state registries (no network calls at all) |
| Expiry-date window impact preview for rulesets | Authentication, roles, messaging, "AICTE records" |

## Proof slips and QR

A proof slip records document-check statuses, simulated strengths, ruleset version, issue time and an audit reference. A SHA-256 **integrity digest** of the record is shown — it detects edits to the stored record in this browser but is **not a cryptographic signature**. Records live in `localStorage`, so a QR link verifies only in the browser that generated it. Every slip reads "Prototype proof slip — not an official AICTE approval."

## Explainable decisions, enhancement and SDGs

- **Officer queue** shows each submission with only its AI-suggested outcome: **Accept** or **Reject** (or "Verifying"). Opening an institution lands on the **AI explanation**: a plain-language paragraph, point-by-point reasons (why rejected / why accepted), an error summary grouped by category, a score breakdown, and the UN SDGs the review supports. **Generate report** downloads the full report including this explanation. Institutions see the same explanation on their application ("Decision explained").
- **Lab and classroom photo enhancement** (Infrastructure tab and the institution's Documents tab): in-browser auto-contrast, brightness correction, sharpening and upscaling, with a before/after slider and measured brightness/contrast/sharpness.
- **SDG alignment** (landing page, explanation panel, report): SDG 4 Quality Education, SDG 9 Industry, Innovation and Infrastructure, SDG 16 Strong Institutions.

## Real checks you can demonstrate

- **Evaluation** (Admin → Evaluation): runs the in-browser analysis over seven labelled documents in `public/samples` (six PDFs + one scanned PNG, ground truth in `manifest.json`) and reports field-extraction accuracy, hidden-text and edit-detection precision/recall and average time. Regenerate the PDFs with `node scripts/make-samples.cjs`.
- **Live lookup**: the verification pipeline queries the public India Post PIN directory (`api.postalpincode.in`) to check an institution's registered city/state. If the service is unreachable the result is reported as UNAVAILABLE, never a mismatch.
- **Sample test documents** are downloadable from the document upload screen.

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS 3 · React Router 6 · Framer Motion · Recharts · Lucide · `qrcode`. State: a small external store (`useSyncExternalStore`) persisted to `localStorage`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # TypeScript
npm run build      # production build → dist/
npm run preview    # serve the production build
```

Requires Node 18+. No Python, database or environment variables.

## Signing in

PRAMAAN opens with an email + password sign-in. Your account decides your workspace (institution portal vs. AICTE console) — there is no role picker. Credentials are display-only demo accounts; the shared demo password is shown under **Demo credentials** on the sign-in page and is stored only as a salted SHA-256 hash in the seed data.

| Role | Email |
| --- | --- |
| Institution Representative | demo.institution@pramaan.demo |
| Scrutiny Officer | demo.officer@pramaan.demo |
| Senior Officer | demo.senior@pramaan.demo |
| Administrator | demo.admin@pramaan.demo |
| Auditor | demo.auditor@pramaan.demo |

To switch roles, log out (top-right menu) and sign in with another account. Frontend sign-in is a demonstration, not production authentication.

## Demo script (≈5 minutes)

1. Landing page → **Explore Institution Portal** (signs in as the institution rep).
2. **New application** → *Extension of Approval* → Create draft.
3. On **Documents**, click **Sample** on each mandatory row (or upload a real PDF/PNG — it stays local) → **Submit application** (Gate 1).
4. **Start verification**; watch the eight stages and activity feed (try *Skip animation*). Open **Findings**.
5. Switch to **Scrutiny Officer** → work queue → open the application. Accept the high-severity finding, dismiss another **with a reason**, then **Decisions → Draft notice → Approve notice** (Gate 4).
6. Switch back to the institution → application → **Rectification** → replace the flagged document(s) → **Resubmit** → watch the re-check; review the **version comparison**.
7. Switch to **Senior Officer** → application **Overview** → try *Record recommendation* (blocked while high-severity findings are unresolved; allowed after rectification resolves them) (Gate 5).
8. Institution → **Generate proof slip** → open the public verification link / scan the QR.
9. Switch to **Administrator** → Rulesets: preview the draft ruleset, approve, activate (Gate 6) → Audit log → **Verify hash chain**.

Seeded data includes 12 fictional institutions, 20 applications (every status), 60 documents and 29 findings across expired certificates, unavailable sources, low-confidence values, duplicate-faculty candidates, reused photos and invoice arithmetic errors. **Admin → Demo data** resets everything.

## Project structure

```
src/
  App.tsx, main.tsx          routes and providers
  components/                Shell, ui kit, FindingCard, DocPreview, UploadWorkspace, ProofSlipView, VersionCompare
  data/                      catalog.ts (checklists), seed.ts (synthetic dataset)
  lib/                       store.ts (state + gates), verificationPlan.ts, findingTemplates.ts,
                             audit.ts, hash.ts, fileInfo.ts, derive.ts, format.ts, theme.ts
  pages/                     Landing, auth, institution/, officer/, admin/, public/
  types/                     shared TypeScript types
```

## Deploying to Vercel

The app is a static Vite build with an SPA fallback already configured in `vercel.json`.

1. Push the repository to GitHub and choose **Add New → Project** in Vercel, importing it.
2. Framework preset **Vite**, build command `npm run build`, output directory `dist` (auto-detected from `vercel.json`).
3. No environment variables are required. Click **Deploy**.

The `rewrites` rule serves `index.html` for every path so deep links such as `/officer/review/APP-2026-0001` and `/verify/PRF-…` refresh correctly. *(This repository has not itself been deployed yet; deployment is not claimed.)*

## Known limitations

- State is per-browser (`localStorage`); clearing site data or using another browser loses it. Nothing is secure storage.
- Roles are a UI/state-layer simulation — anyone can switch roles. Not authentication.
- No real OCR, PDF forensics, perceptual hashing, DigiLocker/CCA/AICTE integrations or cryptographic signatures.
- Uploaded-file previews are not persisted across refresh (metadata is).
- The audit hash chain gives tamper *evidence* for stored entries only.
- Bundle is a single ~900 kB chunk (not code-split).

## Future backend roadmap

FastAPI/PostgreSQL service with real authentication and server-side authorization; object storage for documents; Tesseract/PaddleOCR extraction; PDF structure analysis and OpenCV/perceptual hashing; DigiLocker and CCA signature validation; Ed25519-signed proof slips with a public verification API; background job runner with SSE progress; append-only audit storage.
