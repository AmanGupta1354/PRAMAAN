import type {
  Application, AppStatus, AppType, AuditEntry, CheckStatus, DemoState, DemoUser, DocRecord, FacultyRecord,
  Finding, FindingStatus, Institution, InvoiceRecord, Notice, Notification, ProofSlip, Rule, Ruleset, SourceAdapter,
} from '../types'
import { DEFAULT_CHECKLISTS } from './catalog'
import { buildExtractions, buildFinding, pickDoc, TEMPLATES } from '../lib/findingTemplates'
import { makeEntry } from '../lib/audit'
import { sha256 } from '../lib/hash'

export const STATE_VERSION = 4
const DAY = 86400000
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600000).toISOString()
const ahead = (days: number) => new Date(Date.now() + days * DAY).toISOString()

const INSTS: [string, string, string, string][] = [
  ['Bharatiya Vidya Institute of Technology', 'Pune', 'Maharashtra', 'BVIT'],
  ['Sarvodaya College of Engineering', 'Indore', 'Madhya Pradesh', 'SCEI'],
  ['Kaveri Polytechnic Institute', 'Mysuru', 'Karnataka', 'KPIM'],
  ['Himalaya Institute of Management', 'Dehradun', 'Uttarakhand', 'HIMD'],
  ['Narmada Technical Campus', 'Bhopal', 'Madhya Pradesh', 'NTCB'],
  ['Lotus Valley College of Engineering', 'Bhubaneswar', 'Odisha', 'LVCE'],
  ['Gomti School of Pharmacy', 'Lucknow', 'Uttar Pradesh', 'GSPL'],
  ['Sagar Institute of Architecture', 'Kochi', 'Kerala', 'SIAK'],
  ['Vaigai Engineering College', 'Madurai', 'Tamil Nadu', 'VECM'],
  ['Aravali Institute of Technology', 'Jaipur', 'Rajasthan', 'AITJ'],
  ['Brahmaputra College of Technology', 'Guwahati', 'Assam', 'BCTG'],
  ['Deccan Institute of Computer Applications', 'Hyderabad', 'Telangana', 'DICH'],
]

interface AppSpec {
  inst: number; type: AppType; status: AppStatus
  findings: [string, FindingStatus?, string?][] // template, status, reason
  lowConf?: boolean
}

const SPECS: AppSpec[] = [
  { inst: 1, type: 'EXT', status: 'AWAITING_HUMAN_REVIEW', findings: [['T1'], ['T2'], ['T3'], ['T6']], lowConf: true },
  { inst: 1, type: 'INTAKE', status: 'DRAFT', findings: [] },
  { inst: 1, type: 'NEW', status: 'RECTIFICATION_REQUESTED', findings: [['T5', 'ACCEPTED'], ['T9', 'NEEDS_EVIDENCE']] },
  { inst: 1, type: 'EXT', status: 'RECOMMENDATION_RECORDED', findings: [['T6', 'RESOLVED'], ['T7', 'DISMISSED', 'Hidden layer is the institution’s watermark; confirmed against the original.']] },
  { inst: 2, type: 'NEW', status: 'AWAITING_HUMAN_REVIEW', findings: [['T10'], ['T4']] },
  { inst: 3, type: 'EXT', status: 'IN_SCRUTINY', findings: [['T1', 'ESCALATED'], ['T8']] },
  { inst: 4, type: 'INTAKE', status: 'PROCESSING', findings: [] },
  { inst: 5, type: 'EXT', status: 'AWAITING_HUMAN_REVIEW', findings: [['T3'], ['T5']] },
  { inst: 6, type: 'NEW', status: 'SUBMITTED', findings: [] },
  { inst: 7, type: 'INTAKE', status: 'RESUBMITTED', findings: [['T9', 'RESOLVED'], ['T2']], lowConf: true },
  { inst: 8, type: 'EXT', status: 'AWAITING_HUMAN_REVIEW', findings: [['T7'], ['T6']] },
  { inst: 9, type: 'NEW', status: 'IN_SCRUTINY', findings: [['T1', 'ACCEPTED'], ['T10']] },
  { inst: 10, type: 'EXT', status: 'RECOMMENDATION_RECORDED', findings: [['T6', 'DISMISSED', 'Source outage; document verified manually by officer (L5).']] },
  { inst: 11, type: 'INTAKE', status: 'AWAITING_HUMAN_REVIEW', findings: [['T4'], ['T3']] },
  { inst: 12, type: 'NEW', status: 'DRAFT', findings: [] },
  { inst: 2, type: 'EXT', status: 'RECTIFICATION_REQUESTED', findings: [['T1', 'ACCEPTED']] },
  { inst: 5, type: 'INTAKE', status: 'AWAITING_HUMAN_REVIEW', findings: [['T2'], ['T8']], lowConf: true },
  { inst: 9, type: 'EXT', status: 'AWAITING_HUMAN_REVIEW', findings: [['T5']] },
  { inst: 10, type: 'NEW', status: 'SUBMITTED', findings: [] },
  { inst: 3, type: 'INTAKE', status: 'AWAITING_HUMAN_REVIEW', findings: [['T10'], ['T6']] },
]

const RULES: Rule[] = [
  { id: 'R-FIRE-01', clause: 'Handbook §4.3.2', text: 'Fire safety certificate must be valid on the submission date.' },
  { id: 'R-EXP-01', clause: 'Handbook §4.3.4', text: 'Certificates expiring within the warning window are flagged.', param: { label: 'Warning window', value: 60, unit: 'days' } },
  { id: 'R-FAC-01', clause: 'Handbook §6.1', text: 'Faculty-to-student ratio must meet the programme minimum.', param: { label: 'Minimum faculty per student', value: 0.05, unit: 'ratio' } },
  { id: 'R-BLD-01', clause: 'Handbook §5.2', text: 'Declared built-up area must not exceed the sanctioned plan.' },
  { id: 'R-INV-01', clause: 'Handbook §7.4', text: 'Invoice line items must sum to the declared total.' },
  { id: 'R-DUP-01', clause: 'Handbook §9.1', text: 'Faculty candidates shared across institutions require officer review.' },
]

const SOURCES: SourceAdapter[] = [
  { id: 'SRC-DL', name: 'DigiLocker', kind: 'Issuer documents', status: 'SIMULATED', strength: 'L1', note: 'Simulated adapter. No DigiLocker connection exists in this prototype.' },
  { id: 'SRC-CCA', name: 'CCA India', kind: 'Digital signature roots', status: 'SIMULATED', strength: 'L2', note: 'Simulated adapter; no cryptographic validation is performed.' },
  { id: 'SRC-AICTE', name: 'AICTE records', kind: 'Approval registry', status: 'SIMULATED', strength: 'L4', note: 'Simulated adapter over seeded fictional records.' },
  { id: 'SRC-NAAC', name: 'NAAC', kind: 'Accreditation', status: 'SIMULATED', strength: 'L4', note: 'Simulated adapter over seeded fictional records.' },
  { id: 'SRC-NBA', name: 'NBA', kind: 'Programme accreditation', status: 'SIMULATED', strength: 'L4', note: 'Simulated adapter over seeded fictional records.' },
  { id: 'SRC-FIRE', name: 'State Fire Services registry', kind: 'Fire NOC', status: 'SIMULATED', strength: 'L3', note: 'Simulated adapter for QR/reference lookups.' },
  { id: 'SRC-MCA', name: 'MCA21 company registry', kind: 'Trust / company records', status: 'UNAVAILABLE', strength: null, note: 'Not configured. Always returns UNAVAILABLE.' },
  { id: 'SRC-GST', name: 'GSTN', kind: 'Invoice / vendor GST', status: 'UNAVAILABLE', strength: null, note: 'Not configured. Always returns UNAVAILABLE.' },
]

const USERS: DemoUser[] = [
  { id: 'U-INST', name: 'Meera Kulkarni', email: 'demo.institution@pramaan.demo', role: 'institution', active: true, instId: 'INST-001' },
  { id: 'U-OFF', name: 'Rohan Deshpande', email: 'demo.officer@pramaan.demo', role: 'scrutiny', active: true },
  { id: 'U-SEN', name: 'Dr. Kavita Rao', email: 'demo.senior@pramaan.demo', role: 'senior', active: true },
  { id: 'U-ADM', name: 'Imran Sheikh', email: 'demo.admin@pramaan.demo', role: 'admin', active: true },
  { id: 'U-AUD', name: 'Ananya Iyer', email: 'demo.auditor@pramaan.demo', role: 'auditor', active: true },
  { id: 'U-OFF2', name: 'Pradeep Nair', email: 'officer.two@pramaan.demo', role: 'scrutiny', active: true },
  { id: 'U-INST2', name: 'Sunita Verma', email: 'rep.sarvodaya@pramaan.demo', role: 'institution', active: false, instId: 'INST-002' },
]

function buildFaculty(): FacultyRecord[] {
  const rows: [string, number, string, string, number, string][] = [
    ['Dr. Anil Verma', 1, 'Professor', 'Ph.D. Computer Science', 1979, '9f3a71c21'],
    ['Dr. Anil Verma', 5, 'Associate Professor', 'Ph.D. Computer Science', 1979, '9f3a71c21'],
    ['Prof. Latha Menon', 1, 'Assistant Professor', 'M.Tech Electronics', 1985, 'b82e10d44'],
    ['Dr. S. Karthikeyan', 9, 'Professor', 'Ph.D. Mechanical', 1974, '44c9ae7f0'],
    ['Prof. Rekha Joshi', 2, 'Assistant Professor', 'M.E. Civil', 1988, '0d1f55e92'],
    ['Dr. Biswajit Das', 11, 'Professor', 'Ph.D. Physics', 1971, 'e7a3390b8'],
    ['Prof. Farah Qureshi', 7, 'Assistant Professor', 'M.Pharm', 1990, '5b66d2a13'],
    ['Dr. Naveen Reddy', 12, 'Associate Professor', 'Ph.D. Data Science', 1982, 'a91c04e57'],
    ['Prof. Gita Pillai', 8, 'Assistant Professor', 'M.Arch', 1986, '73ee8b0c6'],
    ['Dr. Harish Chauhan', 10, 'Professor', 'Ph.D. Electrical', 1976, 'c20b7f9d1'],
  ]
  return rows.map(([name, inst, designation, qualification, dobYear, photoHash], i) => ({
    id: `FAC-${String(i + 1).padStart(3, '0')}`, name, instId: `INST-${String(inst).padStart(3, '0')}`,
    designation, qualification, dobYear, photoHash, panLike: `XXXXX${1000 + i * 37}X`,
  }))
}

function buildInvoices(): InvoiceRecord[] {
  const mk = (n: number, inst: number, vendor: string, invoiceNo: string, lines: [string, number, number][], extra = 0): InvoiceRecord => ({
    id: `INV-${String(n).padStart(3, '0')}`, instId: `INST-${String(inst).padStart(3, '0')}`, vendor, invoiceNo,
    lines: lines.map(([item, qty, rate]) => ({ item, qty, rate })),
    declaredTotal: lines.reduce((s, [, q, r]) => s + q * r, 0) + extra,
  })
  return [
    mk(1, 1, 'Orbit Lab Systems', 'OLS/25/0457', [['Oscilloscope 100MHz', 10, 42500], ['Function generator', 10, 14250], ['Digital multimeter', 25, 3200]], 60000),
    mk(2, 8, 'Orbit Lab Systems', 'OLS/25/0457', [['Oscilloscope 100MHz', 5, 42500], ['Soldering station', 12, 3800]]),
    mk(3, 2, 'Kiran Scientific', 'KS-2291', [['Spectrophotometer', 2, 118000], ['Analytical balance', 4, 21500]]),
    mk(4, 3, 'Mysore Tools & Dies', 'MTD/0912', [['Lathe machine', 3, 185000], ['Bench drill', 6, 18500]]),
    mk(5, 5, 'Vindhya Computers', 'VC-7781', [['Workstation PC', 40, 38500], ['Network switch', 4, 12250]]),
    mk(6, 6, 'Utkal Instruments', 'UI/118', [['Wind tunnel kit', 1, 265000], ['Strain gauge set', 8, 7200]]),
    mk(7, 7, 'Awadh Pharma Equip', 'APE-3305', [['Dissolution tester', 2, 142000], ['Tablet press', 1, 198000]]),
    mk(8, 9, 'Tamil Digital', 'TD-5521', [['Raspberry Pi kit', 60, 5400], ['Logic analyzer', 8, 9800]]),
    mk(9, 10, 'Marwar Hydraulics', 'MH/771', [['Hydraulic bench', 2, 156000], ['Flow meter', 6, 11400]]),
    mk(10, 11, 'Assam Digital Labs', 'ADL-204', [['Server rack', 2, 96000], ['UPS 10kVA', 2, 78000]]),
  ]
}

export function buildSeed(): DemoState {
  const institutions: Institution[] = INSTS.map(([name, city, state, code], i) => ({
    id: `INST-${String(i + 1).padStart(3, '0')}`, name, city, state, code,
  }))

  const apps: Application[] = []
  const docs: DocRecord[] = []
  const findings: Finding[] = []
  const notices: Notice[] = []
  const notifications: Notification[] = []
  const extracted = [] as DemoState['extracted']
  const proofs: ProofSlip[] = []
  let fSeq = 1
  let dSeq = 1
  let nSeq = 1
  const rawAudit: Omit<AuditEntry, 'id' | 'prevHash' | 'hash'>[] = []
  const log = (at: string, actor: string, role: string, action: string, target: string, detail: string) => {
    rawAudit.push({ at, actor, role, action, target, detail })
  }

  SPECS.forEach((spec, idx) => {
    const appId = `APP-2026-${String(idx + 1).padStart(4, '0')}`
    const inst = institutions[spec.inst - 1]
    const created = ago(30 - idx, idx)
    const submittedAt = spec.status === 'DRAFT' ? undefined : ago(25 - idx, idx)
    const timeline: Application['timeline'] = [{ at: created, label: 'Draft created', actor: inst.code }]
    if (submittedAt) timeline.push({ at: submittedAt, label: 'Submitted by institution (Gate 1)', actor: inst.code })
    const app: Application = {
      id: appId, instId: inst.id, type: spec.type, session: '2026-27', createdAt: created, submittedAt,
      status: spec.status, notes: [], timeline,
      verifiedOnce: !['DRAFT', 'SUBMITTED', 'PROCESSING'].includes(spec.status),
      lastRunAt: ['DRAFT', 'SUBMITTED', 'PROCESSING'].includes(spec.status) ? undefined : ago(24 - idx),
    }
    apps.push(app)

    // 3 documents per application
    const reqs = DEFAULT_CHECKLISTS[spec.type].filter((r) => r.mandatory).slice(0, 3)
    const appDocs: DocRecord[] = reqs.map((r, k) => {
      const id = `DOC-${String(dSeq++).padStart(4, '0')}`
      const fp = sha256(`${appId}:${r.key}`)
      const expired = spec.findings.some(([t]) => t === 'T1') && r.key === 'FIRE'
      return {
        id, appId, reqKey: r.key, name: r.name, fileName: `${r.key.toLowerCase()}_${inst.code.toLowerCase()}_${k + 1}.pdf`,
        size: 180000 + ((idx * 53 + k * 91) % 400) * 1024, mime: 'application/pdf', fingerprint: fp,
        pages: 2 + ((idx + k) % 5), uploadedAt: ago(28 - idx), source: 'SEED_SAMPLE' as const, version: 1,
        history: [], status: 'PENDING' as CheckStatus,
        expiresOn: r.key === 'FIRE' ? (expired ? ago(40 + idx) : ahead(25 + ((idx * 37) % 380))) : undefined,
      }
    })
    appDocs.forEach((d) => { d.history = [{ version: 1, fileName: d.fileName, size: d.size, fingerprint: d.fingerprint, uploadedAt: d.uploadedAt, pages: d.pages, expiresOn: d.expiresOn }] })

    // findings
    spec.findings.forEach(([tid, status, reason], i) => {
      const t = TEMPLATES[tid]
      const doc = pickDoc(t, appDocs, i)
      const f = buildFinding(`F-${String(fSeq++).padStart(4, '0')}`, appId, t, doc, ago(24 - idx))
      if (status) {
        f.status = status
        if (status !== 'RESOLVED' || true) f.decision = { by: 'Rohan Deshpande', at: ago(20 - idx), action: status, reason }
      }
      findings.push(f)
      // worst verdict on doc
      if (f.status !== 'RESOLVED' && f.status !== 'DISMISSED') doc.status = f.verdict
    })
    appDocs.forEach((d) => {
      if (d.status === 'PENDING' && app.verifiedOnce) d.status = 'VERIFIED'
    })
    docs.push(...appDocs)

    if (app.verifiedOnce) {
      const ex = buildExtractions(`E${idx + 1}`, appId, appDocs, !!spec.lowConf)
      extracted.push(...ex)
      const lc = ex.find((e) => !e.confirmed)
      findings.filter((f) => f.appId === appId && TEMPLATES.T2.checkId === f.checkId).forEach((f) => { f.dependsOnValue = lc?.id })
      timeline.push({ at: ago(24 - idx), label: 'Verification completed — findings generated (simulated)', actor: 'PRAMAAN' })
    }
    if (spec.status === 'RECTIFICATION_REQUESTED') {
      const nid = `N-${String(nSeq++).padStart(3, '0')}`
      const accepted = findings.filter((f) => f.appId === appId && f.status !== 'RESOLVED')
      notices.push({
        id: nid, appId, approved: idx === 2, createdAt: ago(10), approvedBy: idx === 2 ? 'Rohan Deshpande' : undefined, approvedAt: idx === 2 ? ago(9) : undefined,
        text: `Dear ${inst.name},\nFollowing scrutiny of ${appId}, please address the following:\n${accepted.map((f, i) => `${i + 1}. ${f.title} — ${f.action}`).join('\n')}\nThis draft notice requires officer approval before delivery. No external message is sent in this prototype.`,
      })
      timeline.push({ at: ago(9), label: idx === 2 ? 'Rectification notice approved (Gate 4)' : 'Rectification notice drafted — awaiting officer approval', actor: 'Scrutiny Officer' })
    }
    if (spec.status === 'RECOMMENDATION_RECORDED') {
      app.recommendation = { text: 'Documents verified; remaining indicators resolved. Recommend proceeding to the next stage.', by: 'Dr. Kavita Rao', at: ago(5) }
      timeline.push({ at: ago(5), label: 'Senior officer recommendation recorded (Gate 5)', actor: 'Senior Officer' })
    }

    log(created, inst.code, 'institution', 'APPLICATION_CREATED', appId, `${spec.type} application created`)
    if (submittedAt) log(submittedAt, inst.code, 'institution', 'APPLICATION_SUBMITTED', appId, 'Gate 1: explicit submission')
    if (app.verifiedOnce) log(ago(24 - idx), 'PRAMAAN', 'system', 'VERIFICATION_COMPLETED', appId, `${spec.findings.length} finding(s) generated (simulated checks)`)
    spec.findings.forEach(([, st], i) => {
      if (st && st !== 'RESOLVED') log(ago(20 - idx), 'Rohan Deshpande', 'scrutiny', `FINDING_${st}`, appId, `Finding #${i + 1}`)
    })
  })

  // proof slips for recommendation-recorded apps
  apps.filter((a) => a.status === 'RECOMMENDATION_RECORDED').forEach((a, i) => {
    const inst = institutions.find((x) => x.id === a.instId)!
    const aDocs = docs.filter((d) => d.appId === a.id)
    const base = {
      id: `PRF-${sha256(a.id).slice(0, 10).toUpperCase()}`, appId: a.id, instId: a.instId, instCode: inst.code, type: a.type,
      issuedAt: ago(4 - i), rulesetVersion: 'v2025.1', officerDecision: 'Senior officer recommendation recorded',
      checks: aDocs.map((d) => ({ name: d.name, status: 'VERIFIED' as CheckStatus, strength: 'L5' as const, simulated: true })),
      auditRef: rawAudit.length,
    }
    proofs.push({ ...base, digest: sha256(JSON.stringify(base)) })
    log(ago(4 - i), 'Dr. Kavita Rao', 'senior', 'PROOF_SLIP_GENERATED', a.id, `Prototype proof ${base.id}`)
  })

  let ntSeq = 0
  const notif = (title: string, body: string, kind: string, days: number, appId?: string, read = false): Notification => ({
    id: `NT-${String(++ntSeq).padStart(3, '0')}`, instId: 'INST-001', appId, kind, title, body, at: ago(days), read,
  })
  notifications.push(
    notif('Verification completed', 'APP-2026-0001 finished automated checks. Officer review is pending.', 'verification', 1, 'APP-2026-0001'),
    notif('Rectification requested', 'An officer-approved notice for APP-2026-0003 is available.', 'rectification', 2, 'APP-2026-0003'),
    notif('Rescan warning', 'Page 3 of the building plan in APP-2026-0003 may need rescanning.', 'rescan', 2, 'APP-2026-0003'),
    notif('Missing document', 'APP-2026-0002 is missing 3 mandatory documents.', 'missing', 3, 'APP-2026-0002', true),
    notif('Certificate expiry reminder', 'Fire safety certificate on APP-2026-0001 needs attention.', 'expiry', 4, 'APP-2026-0001', true),
    notif('Proof slip generated', 'A prototype proof slip is available for APP-2026-0004.', 'proof', 4, 'APP-2026-0004', true),
  )

  const rulesets: Ruleset[] = [
    { id: 'RS-2024.3', name: 'Scrutiny ruleset 2024.3', version: 'v2024.3', status: 'RETIRED', expiryWarnDays: 45, minFacultyRatio: 0.05, rules: RULES, createdAt: ago(400) },
    { id: 'RS-2025.1', name: 'Scrutiny ruleset 2025.1', version: 'v2025.1', status: 'ACTIVE', expiryWarnDays: 60, minFacultyRatio: 0.05, rules: RULES, createdAt: ago(200), activatedAt: ago(190), approvedBy: 'Imran Sheikh' },
    { id: 'RS-2026.0', name: 'Scrutiny ruleset 2026.0 (draft)', version: 'v2026.0', status: 'DRAFT', expiryWarnDays: 120, minFacultyRatio: 0.06, rules: RULES, createdAt: ago(3) },
  ]

  log(ago(190), 'Imran Sheikh', 'admin', 'RULESET_ACTIVATED', 'RS-2025.1', 'Ruleset v2025.1 activated')
  rawAudit.sort((a, b) => a.at.localeCompare(b.at))
  const audit: AuditEntry[] = []
  rawAudit.forEach((e) => audit.push(makeEntry(audit[audit.length - 1], e)))

  return {
    v: STATE_VERSION, session: null, institutions, checklists: JSON.parse(JSON.stringify(DEFAULT_CHECKLISTS)),
    apps, docs, extracted, findings, notices, notifications, audit, proofs, rulesets, users: USERS,
    sources: SOURCES, faculty: buildFaculty(), invoices: buildInvoices(), seq: 1000,
  }
}
