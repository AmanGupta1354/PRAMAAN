import type { DemoState, Finding, Strength } from '../types'
import { fmtSize, short } from './format'
import { scenarioFor, TEMPLATES } from './findingTemplates'

export type ItemStatus = 'ok' | 'warn' | 'bad' | 'info' | 'na'
export interface PlanItem {
  id: string; title: string; detail: string; status: ItemStatus
  tag?: string; right?: string; strength?: Strength; confirm?: boolean
}
export interface PlanStage { id: string; name: string; blurb: string; items: PlanItem[] }
export interface Plan {
  stages: PlanStage[]
  flags: { rule: string; checkId: string; title: string; verdict: string; severity: string }[]
  fromExisting: boolean
}

export const STAGE_DEFS = [
  ['ingest', 'Document ingestion', 'Validate files, read size and type, compute SHA-256 fingerprints.'],
  ['quality', 'Document quality', 'Blur, completeness, orientation and resolution indicators.'],
  ['extract', 'OCR & field extraction', 'Sample extraction with page references and confidence.'],
  ['rules', 'Handbook compliance', 'Deterministic rules applied to confirmed values.'],
  ['forensics', 'Document forensics', 'Metadata, hidden text and structure indicators.'],
  ['sources', 'Official-source verification', 'Simulated adapters — no government source is contacted.'],
  ['cross', 'Cross-college checks', 'Duplicate faculty, photos and invoice identifiers in seeded data.'],
  ['findings', 'Findings generation', 'Combine results into an evidence-based review. Officer decides.'],
] as const

const SIM = 'SIMULATED CHECK'
const SRC = 'SIMULATED SOURCE RESPONSE'
const FOR = 'SIMULATED FORENSIC RESULT'

export function buildPlan(s: DemoState, appId: string): Plan {
  const app = s.apps.find((a) => a.id === appId)!
  const docs = s.docs.filter((d) => d.appId === appId)
  const existing = s.findings.filter((f) => f.appId === appId)
  const fromExisting = existing.length > 0 || !!app.verifiedOnce
  const rerun = docs.some((d) => d.needsRerun)
  const flagsSrc: Pick<Finding, 'rule' | 'checkId' | 'title' | 'verdict' | 'severity'>[] =
    rerun ? [] : fromExisting ? existing : scenarioFor(appId).map((t) => TEMPLATES[t])
  const flags = flagsSrc.map((f) => ({ rule: f.rule, checkId: f.checkId, title: f.title, verdict: f.verdict, severity: f.severity }))
  const has = (rule: string) => flags.find((f) => f.rule.startsWith(rule))
  const hasCheck = (c: string) => flags.find((f) => f.checkId === c)
  const targetDocs = rerun ? docs.filter((d) => d.needsRerun) : docs

  const ingest: PlanItem[] = targetDocs.map((d) => ({
    id: `in-${d.id}`, title: d.fileName,
    detail: `${d.name} · ${d.mime.split('/')[1].toUpperCase()} · ${fmtSize(d.size)}${d.pages ? ` · ${d.pages} page(s)` : ''}${d.width ? ` · ${d.width}×${d.height}px` : ''} · SHA-256 ${short(d.fingerprint, 16)}`,
    status: 'ok',
    tag: d.source === 'BROWSER_UPLOAD' ? 'COMPUTED IN BROWSER' : d.source === 'DEMO_SAMPLE' ? 'LABELLED DEMO SAMPLE' : 'SEEDED SAMPLE METADATA',
  }))

  const lowRes = docs.find((d) => d.width && Math.min(d.width, d.height ?? 0) < 800)
  const quality: PlanItem[] = [
    { id: 'q1', title: 'Scan quality', detail: 'Overall scan quality score 86/100', status: 'ok', tag: SIM, right: '86' },
    hasCheck('CHK-QUALITY')
      ? { id: 'q2', title: 'Blur indicator', detail: 'Page 3 appears blurred (score 41/100). Rescan recommended.', status: 'warn', tag: SIM, right: '41' }
      : { id: 'q2', title: 'Blur indicator', detail: 'No blurred pages indicated (min score 82/100)', status: 'ok', tag: SIM, right: '82' },
    { id: 'q3', title: 'Page completeness', detail: `${targetDocs.reduce((n, d) => n + (d.pages ?? 1), 0)} page(s) counted; no blank pages indicated`, status: 'ok', tag: SIM },
    { id: 'q4', title: 'Orientation', detail: 'All pages upright (0° skew estimate)', status: 'ok', tag: SIM },
    lowRes
      ? { id: 'q5', title: 'Resolution indicator', detail: `${lowRes.fileName}: ${lowRes.width}×${lowRes.height}px is low for scrutiny. Rescan suggested.`, status: 'warn', tag: 'COMPUTED IN BROWSER' }
      : { id: 'q5', title: 'Resolution indicator', detail: 'Effective resolution ≥ 200 DPI equivalent', status: 'ok', tag: SIM },
  ]

  const ex = s.extracted.filter((e) => e.appId === appId && targetDocs.some((d) => d.id === e.docId))
  const sampleEx: (readonly [string, string, number, number])[] = [
    ['Institution name', 'Registered institution name', 1, 0.97], ['Certificate number', 'FSC/…/2025', 1, 0.93],
    ['Issue date', '12 Mar 2025', 1, 0.95], ['Expiry date', has('R-FIRE-01') ? 'Past date (expired)' : 'Future date', 1, 0.96],
    ['Faculty count', '48', 2, has('R-FAC-01') ? 0.62 : 0.94], ['Declared built-up area', '4,200 sq m', 2, 0.9],
  ]
  const exRows = ex.length && !rerun ? ex.map((e) => [e.field, e.value, e.page, e.confidence] as const) : sampleEx
  const extract: PlanItem[] = exRows.map(([f, v, p, c], i) => ({
    id: `x${i}`, title: f, detail: `${v} · page ${p}`, status: c < 0.8 ? 'warn' : 'ok', right: `${Math.round(c * 100)}%`,
    tag: 'SAMPLE EXTRACTION — no real OCR', confirm: c < 0.8,
  }))

  const rule = (id: string, clause: string, input: string, expected: string, observedOk: string, observedBad: string, held = false): PlanItem => {
    const f = has(id)
    return {
      id, title: `${id} · ${clause}`, tag: 'DETERMINISTIC RULE',
      detail: `Input: ${input} · Expected: ${expected} · Observed: ${held && f ? 'value held — awaiting human confirmation (Gate 2)' : f ? observedBad : observedOk}`,
      status: f ? (held ? 'warn' : 'bad') : 'ok',
    }
  }
  const rules: PlanItem[] = [
    rule('R-FIRE-01', 'Handbook §4.3.2', 'Fire certificate expiry', 'valid on submission date', 'valid', 'expired before submission'),
    rule('R-FAC-01', 'Handbook §6.1', 'Faculty count', 'meets minimum ratio', 'meets ratio', 'unconfirmed', true),
    rule('R-BLD-01', 'Handbook §5.2', 'Declared vs sanctioned area', 'declared ≤ sanctioned', 'consistent', '4,200 > 3,650 sq m'),
    rule('R-INV-01', 'Handbook §7.4', 'Invoice line items', 'Σ(qty×rate) = declared total', 'totals match', 'difference ₹60,000'),
    rule('R-DUP-01', 'Handbook §9.1', 'Faculty identity candidates', 'no cross-college candidate', 'none', 'candidate found — review'),
    { id: 'R-EXP-01', title: 'R-EXP-01 · Handbook §4.3.4', tag: 'DETERMINISTIC RULE', status: 'ok', detail: `Input: certificate expiry · Expected: outside ${s.rulesets.find((r) => r.status === 'ACTIVE')?.expiryWarnDays ?? 60}-day warning window · Observed: ok` },
  ]

  const dupHit = s.docs.find((d) => d.appId !== appId && targetDocs.some((t) => t.fingerprint === d.fingerprint))
  const forensics: PlanItem[] = [
    { id: 'f1', title: 'PDF metadata inspection', detail: 'Producer/creation-date fields read as sample values; no inconsistency indicated', status: 'ok', tag: FOR },
    hasCheck('CHK-FOR-HIDDEN')
      ? { id: 'f2', title: 'Hidden-text indicator', detail: 'Unusual structure: text layer beneath an image region on page 2. Review required — not proof of tampering.', status: 'warn', tag: FOR }
      : { id: 'f2', title: 'Hidden-text indicator', detail: 'No hidden text layer indicated', status: 'ok', tag: FOR },
    { id: 'f3', title: 'Structural-change indicator', detail: 'No incremental-update anomalies indicated', status: 'ok', tag: FOR },
    hasCheck('CHK-DUP-PHOTO')
      ? { id: 'f4', title: 'Duplicate-photo comparison', detail: 'Potential duplicate: 91% perceptual-hash similarity with a photo in another application.', status: 'warn', tag: FOR }
      : { id: 'f4', title: 'Duplicate-photo comparison', detail: 'No similar photograph found in the seeded store', status: 'ok', tag: FOR },
    dupHit
      ? { id: 'f5', title: 'File fingerprint comparison', detail: `Identical SHA-256 as ${dupHit.id} (${dupHit.appId}). Additional verification recommended.`, status: 'warn', tag: 'COMPUTED IN BROWSER' }
      : { id: 'f5', title: 'File fingerprint comparison', detail: `No identical SHA-256 among ${s.docs.length - targetDocs.length} other documents in this demo store`, status: 'ok', tag: 'COMPUTED IN BROWSER' },
  ]

  const fireBad = !!has('R-FIRE-01')
  const sources: PlanItem[] = [
    { id: 's1', title: 'DigiLocker', detail: fireBad ? 'Issuer record fetched: status “Expired”' : 'Issuer record fetched: status “Valid”', status: fireBad ? 'bad' : 'ok', tag: SRC, strength: 'L1' },
    hasCheck('CHK-SRC-CCA')
      ? { id: 's2', title: 'CCA India', detail: 'Timeout after 8s — reported as UNAVAILABLE, not a mismatch', status: 'na', tag: SRC }
      : { id: 's2', title: 'CCA India', detail: 'Signature-chain response simulated (no cryptographic validation performed)', status: 'info', tag: SRC, strength: 'L2' },
    hasCheck('CHK-REC-LOOKUP')
      ? { id: 's3', title: 'AICTE records', detail: '0 records found. A missing record does not mean the document is invalid.', status: 'warn', tag: SRC, strength: 'L4' }
      : { id: 's3', title: 'AICTE records', detail: 'Matching fictional record found', status: 'ok', tag: SRC, strength: 'L4' },
    { id: 's4', title: 'NAAC / NBA', detail: 'No accreditation claimed in this application; lookup skipped', status: 'info', tag: SRC },
    { id: 's5', title: 'State Fire Services registry', detail: fireBad ? 'Reference located; certificate date past' : 'Reference located; certificate current', status: fireBad ? 'bad' : 'ok', tag: SRC, strength: 'L3' },
    { id: 's6', title: 'MCA21 / GSTN', detail: 'Adapter not configured — UNAVAILABLE', status: 'na', tag: 'UNAVAILABLE' },
  ]

  const myInst = app.instId
  const invDup = s.invoices.find((i) => i.instId === myInst && s.invoices.some((o) => o.instId !== myInst && o.invoiceNo === i.invoiceNo))
  const cross: PlanItem[] = [
    has('R-DUP-01')
      ? { id: 'c1', title: 'Duplicate faculty', detail: '“Dr. Anil Verma”: photo hash and birth year match FAC-005 at another institution. Candidate — officer review required.', status: 'warn', tag: 'DEMO FINDING (seeded data)' }
      : { id: 'c1', title: 'Duplicate faculty', detail: 'No candidate among 10 seeded faculty records', status: 'ok', tag: 'DEMO FINDING (seeded data)' },
    hasCheck('CHK-DUP-PHOTO')
      ? { id: 'c2', title: 'Reused photographs', detail: 'pHash distance 6/64 against a photo in another application', status: 'warn', tag: 'DEMO FINDING (seeded data)' }
      : { id: 'c2', title: 'Reused photographs', detail: 'No match above threshold', status: 'ok', tag: 'DEMO FINDING (seeded data)' },
    invDup
      ? { id: 'c3', title: 'Repeated invoice identifier', detail: `Invoice ${invDup.invoiceNo} (${invDup.vendor}) also appears at another institution. Computed from seeded invoices.`, status: 'warn', tag: 'COMPUTED FROM SEEDED DATA' }
      : { id: 'c3', title: 'Repeated invoice identifier', detail: 'No repeated invoice numbers among 10 seeded invoices', status: 'ok', tag: 'COMPUTED FROM SEEDED DATA' },
    { id: 'c4', title: 'Similar institution records', detail: 'No near-duplicate institution names in the seeded set', status: 'ok', tag: 'DEMO FINDING (seeded data)' },
  ]

  const bad = flags.filter((f) => ['MISMATCH', 'EXPIRED'].includes(f.verdict)).length
  const review = flags.filter((f) => f.verdict === 'MANUAL_REQUIRED' || f.verdict === 'NOT_FOUND').length
  const unavail = flags.filter((f) => f.verdict === 'UNAVAILABLE').length
  const all = [ingest, quality, extract, rules, forensics, sources, cross].flat()
  const okN = all.filter((i) => i.status === 'ok').length
  const summary: PlanItem[] = [
    { id: 'z1', title: 'Checks completed', detail: `${all.length} checks executed`, status: 'info', right: String(all.length) },
    { id: 'z2', title: 'Passed', detail: `${okN} checks passed`, status: 'ok', right: String(okN) },
    { id: 'z3', title: 'Mismatch / expired', detail: `${bad} finding(s) with a hard discrepancy`, status: bad ? 'bad' : 'ok', right: String(bad) },
    { id: 'z4', title: 'Manual review / not found', detail: `${review} item(s) require human review`, status: review ? 'warn' : 'ok', right: String(review) },
    { id: 'z5', title: 'Unavailable', detail: `${unavail + 1} source(s) unavailable`, status: 'na', right: String(unavail + 1) },
    { id: 'z6', title: 'Outcome', detail: 'Verification demo completed. Officer review required.', status: 'info', tag: 'NO AUTOMATIC APPROVAL OR REJECTION' },
  ]

  const items = [ingest, quality, extract, rules, forensics, sources, cross, summary]
  return {
    flags, fromExisting,
    stages: STAGE_DEFS.map(([id, name, blurb], i) => ({ id, name, blurb, items: items[i] })),
  }
}
export type { Strength }
