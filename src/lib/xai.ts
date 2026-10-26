import type { Application, CheckStatus, DemoState, Finding, Severity } from '../types'
import { APP_TYPE_LABEL } from './format'
import { DEFAULT_INFRA, infraChecks, recordChecks } from './records'
import { SDGS, type Sdg } from './sdg'

export type Outcome = 'ACCEPT' | 'REJECT' | 'PENDING'
export interface Point { title: string; detail: string; ref?: string; severity?: Severity; action?: string }
export interface Factor { label: string; delta: number }
export interface ErrorGroup { category: string; count: number; items: string[] }
export interface SdgHit extends Sdg { why: string }
export interface Explanation {
  outcome: Outcome; score: number; headline: string; paragraph: string
  against: Point[]; supports: Point[]; factors: Factor[]; errors: ErrorGroup[]; nextSteps: string[]; sdg: SdgHit[]
  counts: { docs: number; verified: number; unresolved: number; high: number; resolved: number }
}

const unresolved = (f: Finding) => f.status !== 'DISMISSED' && f.status !== 'RESOLVED'
const WEIGHT: Record<Severity, number> = { HIGH: 28, MEDIUM: 10, LOW: 3 }

const CATEGORY = (checkId: string) =>
  checkId === 'CHK-EXPIRY' ? 'Expired documents'
    : ['CHK-AREA', 'CHK-INV-ARITH', 'CHK-FAC-COUNT'].includes(checkId) ? 'Value mismatches and inconsistencies'
    : checkId.startsWith('CHK-FOR') ? 'Forensic indicators (review needed)'
    : checkId.startsWith('CHK-DUP') ? 'Duplicates and reuse'
    : checkId === 'CHK-QUALITY' ? 'Scan quality'
    : 'Source and record lookups'

/** Cheap outcome only (used by lists). */
export function outcomeOf(s: DemoState, app: Application): Outcome {
  if (!app.verifiedOnce) return 'PENDING'
  const open = s.findings.filter((f) => f.appId === app.id && unresolved(f))
  if (open.some((f) => f.severity === 'HIGH') || open.filter((f) => f.severity === 'MEDIUM').length >= 2) return 'REJECT'
  if (recordChecks(s, app).some((r) => r.status === 'MISMATCH' || r.status === 'EXPIRED')) return 'REJECT'
  return 'ACCEPT'
}

export function explain(s: DemoState, app: Application): Explanation {
  const inst = s.institutions.find((i) => i.id === app.instId)!
  const docs = s.docs.filter((d) => d.appId === app.id)
  const all = s.findings.filter((f) => f.appId === app.id)
  const open = all.filter(unresolved)
  const settled = all.filter((f) => !unresolved(f))
  const recs = recordChecks(s, app)
  const recHard = recs.filter((r) => r.status === 'MISMATCH' || r.status === 'EXPIRED')
  const recSoft = recs.filter((r) => r.status === 'MANUAL_REQUIRED' || r.status === 'NOT_FOUND')
  const infra = infraChecks(s, app, DEFAULT_INFRA)
  const infraBad = infra.rows.filter((r) => r.status === 'MISMATCH')
  const verified = docs.filter((d) => d.status === 'VERIFIED').length
  const outcome = outcomeOf(s, app)

  const against: Point[] = [
    ...open.sort((a, b) => WEIGHT[b.severity] - WEIGHT[a.severity]).map((f) => ({ title: f.title, detail: f.description, ref: f.id, severity: f.severity, action: f.action })),
    ...recHard.map((r) => ({ title: `AICTE record: ${r.label}`, detail: `${r.note} (application: ${r.application}; record: ${r.record})`, severity: 'HIGH' as Severity, action: 'Reconcile the application with the AICTE record or provide supporting documents.' })),
    ...recSoft.map((r) => ({ title: `AICTE record: ${r.label}`, detail: r.note, severity: 'LOW' as Severity, action: 'Officer to confirm before scrutiny proceeds.' })),
    ...infraBad.map((r) => ({ title: `Infrastructure: ${r.label}`, detail: `Declared ${r.declared}, required ${r.required}. ${r.note}`, severity: 'MEDIUM' as Severity, action: 'Provide additional evidence or consider a physical inspection.' })),
  ]

  const supports: Point[] = []
  if (docs.length) supports.push({ title: `${verified} of ${docs.length} documents verified`, detail: 'These documents passed every automated check with no open finding.' })
  const okRecs = recs.filter((r) => r.status === 'VERIFIED')
  if (okRecs.length) supports.push({ title: `${okRecs.length} AICTE record checks agree`, detail: okRecs.map((r) => r.label).join(', ') + ' match the application.' })
  const okInfra = infra.rows.filter((r) => r.status === 'VERIFIED')
  if (okInfra.length) supports.push({ title: `${okInfra.length} infrastructure checks met`, detail: okInfra.map((r) => r.label).join(', ') + ' meet the configured requirement.' })
  if (settled.length) supports.push({ title: `${settled.length} earlier finding(s) closed`, detail: settled.map((f) => `${f.id} ${f.status.toLowerCase()}`).join(', ') + ' by officers or after re-checking replaced documents.' })
  if (all.length === 0 && app.verifiedOnce) supports.push({ title: 'No findings raised', detail: 'The verification engine found nothing that needs review.' })

  const sev = (v: Severity) => open.filter((f) => f.severity === v).length
  const factors: Factor[] = [
    { label: `${sev('HIGH')} high-severity finding(s)`, delta: -WEIGHT.HIGH * sev('HIGH') },
    { label: `${sev('MEDIUM')} medium-severity finding(s)`, delta: -WEIGHT.MEDIUM * sev('MEDIUM') },
    { label: `${sev('LOW')} low-severity finding(s)`, delta: -WEIGHT.LOW * sev('LOW') },
    { label: `${recHard.length} AICTE record mismatch(es)`, delta: -15 * recHard.length },
    { label: `${recSoft.length} record item(s) to confirm`, delta: -4 * recSoft.length },
    { label: `${infraBad.length} infrastructure shortfall(s)`, delta: -5 * infraBad.length },
  ].filter((f) => f.delta !== 0)
  const score = Math.max(0, Math.min(100, 100 + factors.reduce((n, f) => n + f.delta, 0)))

  const groups = new Map<string, string[]>()
  open.forEach((f) => { const k = CATEGORY(f.checkId); groups.set(k, [...(groups.get(k) ?? []), `${f.id} ${f.title}`]) })
  if (recHard.length || recSoft.length) groups.set('AICTE record cross-check', [...recHard, ...recSoft].map((r) => `${r.label}: ${r.note}`))
  if (infraBad.length) groups.set('Infrastructure shortfalls', infraBad.map((r) => `${r.label}: declared ${r.declared}, required ${r.required}`))
  const errors: ErrorGroup[] = [...groups].map(([category, items]) => ({ category, count: items.length, items }))

  const nextSteps = [...new Set(against.map((p) => p.action).filter(Boolean) as string[])]
  const top = against.slice(0, 3).map((p) => p.title)
  const head = against[0]

  let headline: string, paragraph: string
  if (outcome === 'PENDING') {
    headline = 'Verification has not completed'
    paragraph = `${app.id} (${APP_TYPE_LABEL[app.type]}, ${inst.name}) has not finished the verification pipeline, so no suggested outcome is available yet.`
  } else if (outcome === 'REJECT') {
    headline = `Suggested outcome: REJECT — ${against.length} unresolved issue(s)`
    paragraph = `PRAMAAN suggests rejecting ${app.id}, the ${APP_TYPE_LABEL[app.type].toLowerCase()} application of ${inst.name}, because ${against.length} issue${against.length === 1 ? '' : 's'} remain unresolved: ${top.join('; ')}${against.length > 3 ? '; and others' : ''}. ` +
      (head ? `The most serious is “${head.title}” — ${head.detail} ` : '') +
      `${verified} of ${docs.length} submitted documents verified cleanly, and the application scores ${score}/100 on the compliance factors below. ` +
      `The outcome would change to accept once the institution corrects these items and the replaced documents pass re-checking. This is decision support: the authorized officer makes the final decision.`
  } else {
    headline = 'Suggested outcome: ACCEPT — no blocking issues'
    paragraph = `PRAMAAN suggests accepting ${app.id}, the ${APP_TYPE_LABEL[app.type].toLowerCase()} application of ${inst.name}. No high-severity finding is open, ${verified} of ${docs.length} documents verified, ` +
      `${okRecs.length} AICTE record checks agree with the application${settled.length ? `, and ${settled.length} earlier finding${settled.length === 1 ? ' was' : 's were'} closed` : ''}. ` +
      (against.length ? `${against.length} minor item${against.length === 1 ? '' : 's'} remain (${top.join('; ')}) but none block approval. ` : '') +
      `The compliance score is ${score}/100. This is decision support: the authorized officer makes the final decision.`
  }

  const sdg: SdgHit[] = SDGS.map((g) => ({
    ...g,
    why: g.goal === 4 ? `Scrutiny of ${inst.name} protects quality of technical education (faculty, safety, facilities).`
      : g.goal === 9 ? `${infra.rows.length} infrastructure checks were run${infra.inspect ? '; inspection is advised' : ''}.`
      : `${all.length} evidence-linked finding(s) and ${s.audit.filter((a) => a.target === app.id).length} audit entries make this decision explainable and accountable.`,
  }))

  return {
    outcome, score, headline, paragraph, against, supports, factors, errors, nextSteps, sdg,
    counts: { docs: docs.length, verified, unresolved: open.length, high: sev('HIGH'), resolved: settled.length },
  }
}

export const OUTCOME_LABEL: Record<Outcome, string> = { ACCEPT: 'Accept', REJECT: 'Reject', PENDING: 'Pending' }
export type { CheckStatus }
