import { useSyncExternalStore } from 'react'
import type {
  AppType, Application, CheckStatus, DemoState, DocRecord, Finding, FindingStatus, Notice, Notification,
  ProofSlip, Requirement, Role, Ruleset,
} from '../types'
import { buildSeed, STATE_VERSION } from '../data/seed'
import { makeEntry, verifyChain } from './audit'
import { buildExtractions, buildFinding, pickDoc, scenarioFor, TEMPLATES } from './findingTemplates'
import { sha256 } from './hash'
import { APP_TYPE_LABEL, daysUntil } from './format'

const KEY = 'pramaan.demo.v4'
export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }
const ok = <T,>(data?: T): Result<T> => ({ ok: true, data: data as T })
const fail = (error: string): Result<never> => ({ ok: false, error })

export interface FileMeta {
  fileName: string; size: number; mime: string; fingerprint: string
  pages?: number; width?: number; height?: number; source: DocRecord['source']
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as DemoState
      if (s && s.v === STATE_VERSION && Array.isArray(s.apps) && Array.isArray(s.docs) && Array.isArray(s.audit)) return s
    }
  } catch { /* fall through to seed */ }
  return buildSeed()
}

let state: DemoState = load()
const listeners = new Set<() => void>()

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage unavailable: state stays in memory */ }
}
function commit(next: DemoState) {
  state = next
  persist()
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l) }
export const getState = () => state
export function useStore(): DemoState { return useSyncExternalStore(subscribe, getState, getState) }

// ---------- helpers ----------
const now = () => new Date().toISOString()
const clone = (): DemoState => structuredClone(state)
const actorOf = (s: DemoState) => {
  const u = s.users.find((x) => x.id === s.session?.userId)
  return { name: u?.name ?? 'Unknown', role: (s.session?.role ?? 'institution') as string }
}
function audit(s: DemoState, action: string, target: string, detail: string) {
  const a = actorOf(s)
  s.audit.push(makeEntry(s.audit[s.audit.length - 1], { at: now(), actor: a.name, role: a.role, action, target, detail }))
}
const nextId = (s: DemoState, prefix: string, pad = 4) => `${prefix}-${String(++s.seq).padStart(pad, '0')}`
function timeline(app: Application, label: string, actor: string) { app.timeline.push({ at: now(), label, actor }) }
function notify(s: DemoState, app: Application, kind: string, title: string, body: string) {
  s.notifications.unshift({ id: nextId(s, 'NT', 3), instId: app.instId, appId: app.id, kind, title, body, at: now(), read: false })
}
const roleIs = (s: DemoState, ...r: Role[]) => !!s.session && r.includes(s.session.role)
const NEED = (what: string) => fail(`Your demo role cannot ${what}. (Frontend demo check — not production security.)`)
const isUnresolved = (f: Finding) => f.status !== 'DISMISSED' && f.status !== 'RESOLVED'

// ---------- session ----------
export const actions = {
  login(userId: string): Result<Role> {
    const u = state.users.find((x) => x.id === userId)
    if (!u) return fail('Unknown demo account')
    if (!u.active) return fail('This demo account is deactivated')
    const s = clone(); s.session = { role: u.role, userId: u.id }
    audit(s, 'DEMO_LOGIN', u.email, `Signed in as ${u.role} (simulated authentication)`)
    commit(s); return ok(u.role)
  },
  logout() {
    const s = clone(); if (s.session) audit(s, 'DEMO_LOGOUT', s.session.userId, 'Signed out')
    s.session = null; commit(s)
  },

  // ---------- institution ----------
  createApp(type: AppType): Result<string> {
    if (!roleIs(state, 'institution')) return NEED('create applications')
    const s = clone(); const u = s.users.find((x) => x.id === s.session!.userId)!
    const inst = s.institutions.find((i) => i.id === u.instId)!
    const id = `APP-2026-${String(++s.seq).padStart(4, '0')}`
    s.apps.unshift({ id, instId: inst.id, type, session: '2026-27', createdAt: now(), status: 'DRAFT', notes: [], timeline: [{ at: now(), label: 'Draft created', actor: inst.code }] })
    audit(s, 'APPLICATION_CREATED', id, `${APP_TYPE_LABEL[type]} draft created`)
    commit(s); return ok(id)
  },
  setAppType(appId: string, type: AppType): Result {
    const s = clone(); const a = s.apps.find((x) => x.id === appId)
    if (!a) return fail('Application not found')
    if (a.status !== 'DRAFT') return fail('The application type can only be changed before submission (Gate 1).')
    a.type = type
    const keys = s.checklists[type].map((r) => r.key)
    s.docs = s.docs.filter((d) => d.appId !== appId || keys.includes(d.reqKey))
    audit(s, 'APPLICATION_TYPE_CHANGED', appId, `Type changed to ${APP_TYPE_LABEL[type]}`)
    commit(s); return ok()
  },
  addDoc(appId: string, reqKey: string, m: FileMeta): Result<string> {
    const s = clone(); const a = s.apps.find((x) => x.id === appId)
    if (!a) return fail('Application not found')
    if (a.status !== 'DRAFT' && a.status !== 'RECTIFICATION_REQUESTED') return fail('Documents can only be added to a draft or while rectification is requested.')
    const req = s.checklists[a.type].find((r) => r.key === reqKey)
    if (!req) return fail('Unknown checklist item')
    const existing = s.docs.find((d) => d.appId === appId && d.reqKey === reqKey)
    if (existing) return actions.replaceDoc(existing.id, m)
    const id = nextId(s, 'DOC')
    s.docs.push({
      id, appId, reqKey, name: req.name, fileName: m.fileName, size: m.size, mime: m.mime, fingerprint: m.fingerprint,
      pages: m.pages, width: m.width, height: m.height, uploadedAt: now(), source: m.source, version: 1,
      history: [{ version: 1, fileName: m.fileName, size: m.size, fingerprint: m.fingerprint, uploadedAt: now(), pages: m.pages }], status: 'PENDING',
    })
    audit(s, 'DOCUMENT_UPLOADED', appId, `${req.name}: ${m.fileName} (${m.source === 'BROWSER_UPLOAD' ? 'browser-local file' : 'labelled demo sample'})`)
    commit(s); return ok(id)
  },
  removeDoc(docId: string): Result {
    const s = clone(); const d = s.docs.find((x) => x.id === docId)
    if (!d) return fail('Document not found')
    const a = s.apps.find((x) => x.id === d.appId)!
    if (a.status !== 'DRAFT') return fail('Documents can only be removed from a draft. Use “Replace” after submission.')
    s.docs = s.docs.filter((x) => x.id !== docId)
    audit(s, 'DOCUMENT_REMOVED', a.id, `${d.name}: ${d.fileName}`)
    commit(s); return ok()
  },
  replaceDoc(docId: string, m: FileMeta, note?: string): Result<string> {
    const s = clone(); const d = s.docs.find((x) => x.id === docId)
    if (!d) return fail('Document not found')
    const a = s.apps.find((x) => x.id === d.appId)!
    if (a.status !== 'DRAFT' && a.status !== 'RECTIFICATION_REQUESTED') return fail('Replacement is available for drafts and when rectification has been requested.')
    if (d.fingerprint === m.fingerprint) return fail('This file has the same SHA-256 fingerprint as the current version; nothing changed.')
    d.version += 1
    Object.assign(d, { fileName: m.fileName, size: m.size, mime: m.mime, fingerprint: m.fingerprint, pages: m.pages, width: m.width, height: m.height, uploadedAt: now(), source: m.source })
    d.history.push({ version: d.version, fileName: m.fileName, size: m.size, fingerprint: m.fingerprint, uploadedAt: now(), pages: m.pages, note })
    if (a.status !== 'DRAFT') { d.needsRerun = true; d.status = 'PENDING' }
    audit(s, 'DOCUMENT_REPLACED', a.id, `${d.name} → v${d.version} (${m.fileName})`)
    timeline(a, `Document replaced: ${d.name} (v${d.version})`, 'Institution')
    commit(s); return ok(d.id)
  },
  submitApp(appId: string): Result {
    if (!roleIs(state, 'institution')) return NEED('submit applications')
    const s = clone(); const a = s.apps.find((x) => x.id === appId)
    if (!a) return fail('Application not found')
    if (a.status !== 'DRAFT') return fail('Only a draft can be submitted.')
    const missing = s.checklists[a.type].filter((r) => r.mandatory && !s.docs.some((d) => d.appId === appId && d.reqKey === r.key))
    if (missing.length) return fail(`Gate 1: ${missing.length} mandatory document(s) missing — ${missing.map((m) => m.name).join(', ')}.`)
    a.status = 'SUBMITTED'; a.submittedAt = now()
    timeline(a, 'Submitted by institution (Gate 1)', 'Institution')
    notify(s, a, 'submission', 'Application submitted', `${a.id} was submitted. Start the verification demo to run the pipeline.`)
    audit(s, 'APPLICATION_SUBMITTED', appId, 'Gate 1: explicit submission action')
    commit(s); return ok()
  },
  resubmit(appId: string, note: string): Result {
    if (!roleIs(state, 'institution')) return NEED('resubmit applications')
    const s = clone(); const a = s.apps.find((x) => x.id === appId)
    if (!a) return fail('Application not found')
    if (a.status !== 'RECTIFICATION_REQUESTED') return fail('Resubmission is only available while rectification is requested.')
    if (!s.docs.some((d) => d.appId === appId && d.needsRerun)) return fail('Replace at least one document before resubmitting.')
    if (note.trim()) a.notes.push(`Institution note: ${note.trim()}`)
    a.status = 'RESUBMITTED'
    timeline(a, 'Resubmitted by institution', 'Institution')
    audit(s, 'APPLICATION_RESUBMITTED', appId, note.trim() || 'Resubmitted')
    commit(s); return ok()
  },

  // ---------- verification (simulated; state transitions are real) ----------
  beginVerification(appId: string): Result {
    const a = state.apps.find((x) => x.id === appId)
    if (!a) return fail('Application not found')
    if (a.status !== 'SUBMITTED' && a.status !== 'RESUBMITTED') return ok()
    const s = clone(); const t = s.apps.find((x) => x.id === appId)!
    t.status = 'PROCESSING'; timeline(t, 'Verification started (frontend simulation)', 'PRAMAAN')
    audit(s, 'VERIFICATION_STARTED', appId, 'Simulated verification pipeline started')
    commit(s); return ok()
  },
  completeVerification(appId: string): Result<{ findings: number }> {
    const s = clone(); const a = s.apps.find((x) => x.id === appId)
    if (!a) return fail('Application not found')
    if (a.status !== 'PROCESSING') return ok({ findings: s.findings.filter((f) => f.appId === appId).length })
    const docs = s.docs.filter((d) => d.appId === appId)
    const rerun = docs.filter((d) => d.needsRerun)
    let created = 0
    if (rerun.length) {
      for (const d of rerun) {
        d.needsRerun = false; d.status = 'VERIFIED'
        if (d.reqKey === 'FIRE') d.expiresOn = new Date(Date.now() + 365 * 86400000).toISOString()
        s.findings.filter((f) => f.docId === d.id && (f.status === 'ACCEPTED' || f.status === 'NEEDS_EVIDENCE' || f.status === 'OPEN')).forEach((f) => {
          f.status = 'RESOLVED'; f.decision = { by: 'PRAMAAN re-check (simulated)', at: now(), action: 'RESOLVED', reason: `Replacement v${d.version} re-checked in the simulator; no issue indicated. Officer review still required.` }
        })
      }
      audit(s, 'FINDINGS_RECHECKED', appId, `${rerun.length} replaced document(s) re-checked (simulated)`)
    } else {
      const scenario = scenarioFor(appId)
      const lowConf = scenario.includes('T2')
      if (scenario.includes('T1')) { const fd = docs.find((d) => d.reqKey === 'FIRE'); if (fd) fd.expiresOn = new Date(Date.now() - 35 * 86400000).toISOString() }
      else docs.filter((d) => d.reqKey === 'FIRE').forEach((d) => { d.expiresOn = new Date(Date.now() + 200 * 86400000).toISOString() })
      const ex = buildExtractions(`X${s.seq}`, appId, docs, lowConf)
      s.seq += ex.length
      s.extracted = s.extracted.filter((e) => e.appId !== appId).concat(ex)
      scenario.forEach((tid, i) => {
        const t = TEMPLATES[tid]; const doc = pickDoc(t, docs, i)
        const lc = ex.find((e) => !e.confirmed)
        s.findings.push(buildFinding(nextId(s, 'F'), appId, t, doc, now(), lc?.id)); created++
        doc.status = t.verdict
      })
      docs.forEach((d) => { if (d.status === 'PENDING') d.status = 'VERIFIED' })
    }
    a.status = 'AWAITING_HUMAN_REVIEW'; a.verifiedOnce = true; a.lastRunAt = now()
    timeline(a, `Verification completed — ${created || 'updated'} finding(s) (simulated)`, 'PRAMAAN')
    notify(s, a, 'verification', 'Verification completed', `${a.id} finished automated checks. Officer review is pending.`)
    audit(s, 'VERIFICATION_COMPLETED', appId, `${created} finding(s) generated (simulated checks)`)
    commit(s); return ok({ findings: created })
  },

  // ---------- officer ----------
  confirmValue(xid: string, value?: string): Result {
    if (!roleIs(state, 'institution', 'scrutiny', 'senior')) return NEED('confirm extracted values')
    const s = clone(); const x = s.extracted.find((e) => e.id === xid)
    if (!x) return fail('Value not found')
    if (value !== undefined && value.trim()) x.value = value.trim()
    x.confirmed = true
    audit(s, 'VALUE_CONFIRMED', x.appId, `Gate 2: “${x.field}” confirmed by a human`)
    commit(s); return ok()
  },
  decideFinding(fid: string, action: 'ACCEPT' | 'DISMISS' | 'REQUEST_EVIDENCE' | 'ESCALATE', reason?: string): Result {
    if (!roleIs(state, 'scrutiny', 'senior')) return NEED('record finding decisions')
    const s = clone(); const f = s.findings.find((x) => x.id === fid)
    if (!f) return fail('Finding not found')
    if (f.status === 'RESOLVED') return fail('This finding is already resolved.')
    if (f.dependsOnValue) {
      const x = s.extracted.find((e) => e.id === f.dependsOnValue)
      if (x && !x.confirmed) return fail(`Gate 2: confirm the low-confidence value “${x.field}” (${Math.round(x.confidence * 100)}%) before deciding this finding.`)
    }
    if (action === 'DISMISS' && (!reason || reason.trim().length < 8)) return fail('Gate 3: dismissing a finding requires a reason (at least 8 characters).')
    const map: Record<typeof action, FindingStatus> = { ACCEPT: 'ACCEPTED', DISMISS: 'DISMISSED', REQUEST_EVIDENCE: 'NEEDS_EVIDENCE', ESCALATE: 'ESCALATED' }
    f.status = map[action]
    f.decision = { by: actorOf(s).name, at: now(), action: f.status, reason: reason?.trim() }
    const a = s.apps.find((x) => x.id === f.appId)!
    if (f.status === 'DISMISSED') {
      const doc = s.docs.find((d) => d.id === f.docId)
      const stillOpen = s.findings.filter((x) => x.docId === f.docId && x.id !== f.id && isUnresolved(x))
      if (doc && !stillOpen.length) doc.status = 'VERIFIED'
    }
    if (a.status === 'AWAITING_HUMAN_REVIEW' || a.status === 'RESUBMITTED') a.status = 'IN_SCRUTINY'
    timeline(a, `Finding ${f.id} ${f.status.toLowerCase().replace('_', ' ')}`, actorOf(s).name)
    audit(s, `FINDING_${f.status}`, f.appId, `${f.id} ${f.title}${reason ? ` — ${reason.trim()}` : ''}`)
    commit(s); return ok()
  },
  draftNotice(appId: string): Result<string> {
    if (!roleIs(state, 'scrutiny', 'senior')) return NEED('draft notices')
    const s = clone(); const a = s.apps.find((x) => x.id === appId)
    if (!a) return fail('Application not found')
    const fs = s.findings.filter((f) => f.appId === appId && (f.status === 'ACCEPTED' || f.status === 'NEEDS_EVIDENCE'))
    if (!fs.length) return fail('Accept a finding or request evidence first; a notice needs at least one item.')
    const inst = s.institutions.find((i) => i.id === a.instId)!
    s.notices = s.notices.filter((n) => n.appId !== appId || n.approved)
    const id = nextId(s, 'N', 3)
    s.notices.push({
      id, appId, approved: false, createdAt: now(),
      text: `Dear ${inst.name},\nFollowing scrutiny of ${appId}, please address the following:\n${fs.map((f, i) => `${i + 1}. ${f.title} — ${f.action}`).join('\n')}\nThis draft notice requires officer approval before it is marked ready for delivery.`,
    })
    audit(s, 'NOTICE_DRAFTED', appId, `${fs.length} item(s)`)
    commit(s); return ok(id)
  },
  approveNotice(nid: string, text?: string): Result {
    if (!roleIs(state, 'scrutiny', 'senior')) return NEED('approve notices')
    const s = clone(); const n = s.notices.find((x) => x.id === nid)
    if (!n) return fail('Notice not found')
    if (n.approved) return fail('Already approved.')
    if (text !== undefined) n.text = text
    n.approved = true; n.approvedBy = actorOf(s).name; n.approvedAt = now()
    const a = s.apps.find((x) => x.id === n.appId)!
    a.status = 'RECTIFICATION_REQUESTED'
    timeline(a, 'Rectification notice approved (Gate 4)', actorOf(s).name)
    notify(s, a, 'rectification', 'Rectification requested', `An officer-approved notice for ${a.id} is available. (Demo: no email/SMS/WhatsApp was sent.)`)
    audit(s, 'NOTICE_APPROVED', n.appId, `Gate 4: notice ${n.id} approved and marked ready for delivery`)
    commit(s); return ok()
  },
  recordRecommendation(appId: string, text: string): Result {
    if (!roleIs(state, 'senior')) return NEED('record recommendations (Senior Officer only)')
    const s = clone(); const a = s.apps.find((x) => x.id === appId)
    if (!a) return fail('Application not found')
    if (['DRAFT', 'SUBMITTED', 'PROCESSING'].includes(a.status)) return fail('Verification and scrutiny must happen before a recommendation.')
    const blockers = s.findings.filter((f) => f.appId === appId && f.severity === 'HIGH' && isUnresolved(f))
    if (blockers.length) return fail(`Gate 5: ${blockers.length} high-severity finding(s) unresolved — ${blockers.map((b) => `${b.id} (${b.status.toLowerCase()})`).join(', ')}. Dismiss with a reason, or wait for rectification to resolve them.`)
    if (text.trim().length < 10) return fail('Enter a recommendation of at least 10 characters.')
    a.recommendation = { text: text.trim(), by: actorOf(s).name, at: now() }
    a.status = 'RECOMMENDATION_RECORDED'
    timeline(a, 'Senior officer recommendation recorded (Gate 5)', actorOf(s).name)
    audit(s, 'RECOMMENDATION_RECORDED', appId, text.trim())
    commit(s); return ok()
  },
  generateProof(appId: string): Result<string> {
    if (!roleIs(state, 'institution', 'scrutiny', 'senior')) return NEED('generate proof slips')
    const s = clone(); const a = s.apps.find((x) => x.id === appId)
    if (!a) return fail('Application not found')
    if (!a.verifiedOnce) return fail('Run the verification pipeline before generating a proof slip.')
    const inst = s.institutions.find((i) => i.id === a.instId)!
    const docs = s.docs.filter((d) => d.appId === appId)
    const fs = s.findings.filter((f) => f.appId === appId)
    const id = `PRF-${sha256(`${appId}:${++s.seq}:${Date.now()}`).slice(0, 10).toUpperCase()}`
    const base = {
      id, appId, instId: inst.id, instCode: inst.code, type: a.type, issuedAt: now(), rulesetVersion: s.rulesets.find((r) => r.status === 'ACTIVE')?.version ?? 'n/a',
      officerDecision: a.recommendation ? 'Senior officer recommendation recorded' : 'No officer decision recorded — verification summary only',
      checks: docs.map((d) => {
        const df = fs.filter((f) => f.docId === d.id)
        const manual = df.some((f) => f.status === 'DISMISSED')
        return { name: d.name, status: d.status as CheckStatus, strength: (manual ? 'L5' : df[0]?.strength ?? null), simulated: !manual }
      }),
      auditRef: s.audit.length + 1,
    }
    const proof: ProofSlip = { ...base, digest: sha256(JSON.stringify(base)) }
    s.proofs.unshift(proof)
    notify(s, a, 'proof', 'Proof slip generated', `Prototype proof slip ${id} is available for ${a.id}.`)
    audit(s, 'PROOF_SLIP_GENERATED', appId, `Prototype proof ${id}`)
    commit(s); return ok(id)
  },
  markRead(id?: string) {
    const s = clone(); s.notifications.forEach((n) => { if (!id || n.id === id) n.read = true }); commit(s)
  },

  // ---------- admin ----------
  createDraftRuleset(name: string, expiryWarnDays: number, minFacultyRatio: number): Result<string> {
    if (!roleIs(state, 'admin')) return NEED('create rulesets')
    if (!name.trim()) return fail('Name is required.')
    if (!(expiryWarnDays > 0 && expiryWarnDays <= 365)) return fail('Warning window must be 1–365 days.')
    if (!(minFacultyRatio > 0 && minFacultyRatio < 1)) return fail('Faculty ratio must be between 0 and 1.')
    const s = clone(); const active = s.rulesets.find((r) => r.status === 'ACTIVE')!
    const id = `RS-D${++s.seq}`
    s.rulesets.push({ id, name: name.trim(), version: `v-draft-${s.seq}`, status: 'DRAFT', expiryWarnDays, minFacultyRatio, rules: active.rules, createdAt: now() })
    audit(s, 'RULESET_DRAFTED', id, `${name.trim()} (window ${expiryWarnDays}d)`)
    commit(s); return ok(id)
  },
  previewRuleset(id: string): Result {
    if (!roleIs(state, 'admin')) return NEED('preview rulesets')
    const s = clone(); const r = s.rulesets.find((x) => x.id === id)
    if (!r) return fail('Ruleset not found')
    if (r.status !== 'DRAFT') return fail('Only a DRAFT ruleset can be previewed.')
    const active = s.rulesets.find((x) => x.status === 'ACTIVE')!
    const flagged = (w: number) => s.docs.filter((d) => d.expiresOn && (daysUntil(d.expiresOn) ?? 9999) <= w)
    r.impact = { docsFlagged: flagged(r.expiryWarnDays).length, docsFlaggedActive: flagged(active.expiryWarnDays).length, appsAffected: new Set(flagged(r.expiryWarnDays).map((d) => d.appId)).size }
    r.status = 'PREVIEWED'; r.previewedAt = now()
    audit(s, 'RULESET_PREVIEWED', id, `Impact: ${r.impact.docsFlagged} vs ${r.impact.docsFlaggedActive} documents flagged`)
    commit(s); return ok()
  },
  approveRuleset(id: string): Result {
    if (!roleIs(state, 'admin')) return NEED('approve rulesets')
    const s = clone(); const r = s.rulesets.find((x) => x.id === id)
    if (!r) return fail('Ruleset not found')
    if (r.status !== 'PREVIEWED') return fail('Gate 6: a ruleset must be previewed before it can be approved.')
    r.status = 'APPROVED'; r.approvedBy = actorOf(s).name
    audit(s, 'RULESET_APPROVED', id, 'Gate 6: administrator approval')
    commit(s); return ok()
  },
  activateRuleset(id: string): Result {
    if (!roleIs(state, 'admin')) return NEED('activate rulesets')
    const s = clone(); const r = s.rulesets.find((x) => x.id === id)
    if (!r) return fail('Ruleset not found')
    if (r.status !== 'APPROVED') return fail('Gate 6: only an APPROVED ruleset can be activated.')
    s.rulesets.forEach((x) => { if (x.status === 'ACTIVE') x.status = 'RETIRED' })
    r.status = 'ACTIVE'; r.activatedAt = now()
    audit(s, 'RULESET_ACTIVATED', id, `${r.version} is now the active ruleset`)
    commit(s); return ok()
  },
  toggleMandatory(type: AppType, key: string): Result {
    if (!roleIs(state, 'admin')) return NEED('edit checklists')
    const s = clone(); const r = s.checklists[type].find((x) => x.key === key)
    if (!r) return fail('Item not found')
    r.mandatory = !r.mandatory
    audit(s, 'CHECKLIST_CHANGED', type, `${r.name} is now ${r.mandatory ? 'mandatory' : 'optional'}`)
    commit(s); return ok()
  },
  addRequirement(type: AppType, name: string, clause: string, mandatory: boolean): Result {
    if (!roleIs(state, 'admin')) return NEED('edit checklists')
    if (name.trim().length < 3) return fail('Document name is required.')
    const s = clone(); const req: Requirement = { key: `X${++s.seq}`, name: name.trim(), mandatory, formats: ['PDF'], clause: clause.trim() || 'Handbook (custom)' }
    s.checklists[type].push(req)
    audit(s, 'CHECKLIST_CHANGED', type, `Added “${req.name}”`)
    commit(s); return ok()
  },
  toggleUser(id: string): Result {
    if (!roleIs(state, 'admin')) return NEED('manage users')
    const s = clone(); const u = s.users.find((x) => x.id === id)
    if (!u) return fail('User not found')
    if (u.id === s.session?.userId) return fail('You cannot deactivate your own demo account.')
    u.active = !u.active
    audit(s, 'USER_CHANGED', u.email, u.active ? 'Activated' : 'Deactivated')
    commit(s); return ok()
  },
  resetDemo(): Result {
    if (!roleIs(state, 'admin')) return NEED('reset demo data')
    const seed = buildSeed(); seed.session = state.session
    commit(seed); return ok()
  },
  verifyAudit() { return verifyChain(state.audit) },
}

// ---------- selectors ----------
export function currentUser(s: DemoState) { return s.users.find((u) => u.id === s.session?.userId) }
export function unresolvedHigh(s: DemoState, appId: string) {
  return s.findings.filter((f) => f.appId === appId && f.severity === 'HIGH' && isUnresolved(f))
}
export const openFindingCount = (s: DemoState, appId: string) => s.findings.filter((f) => f.appId === appId && (f.status === 'OPEN' || f.status === 'ESCALATED' || f.status === 'NEEDS_EVIDENCE')).length
export type { Notice, Notification, Ruleset }
