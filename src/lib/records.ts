import type { Application, CheckStatus, DemoState, Institution } from '../types'
import { seedNum } from './hash'
import { fmtDate } from './format'

export const REC_TAG = 'SIMULATED AICTE RECORD (seeded)'

export interface InstRecord {
  prevEoa: { year: string; status: string }
  approved: { programme: string; intake: number }[]
  ter: { paid: boolean; ref: string }
  deficiencyOpen: number
  affidavit: boolean
  nocs: { name: string; ref: string; validUntil?: string }[]
}

/** Deterministic fictional "AICTE system" record for an institution. Not real data. */
export function institutionRecord(inst: Institution, fireExpiry?: string): InstRecord {
  const h = seedNum(inst.id)
  const base = h % 6 === 0 ? 240 : 180
  return {
    prevEoa: { year: '2025-26', status: h % 5 === 0 ? 'Granted with conditions' : 'Granted' },
    approved: [{ programme: 'B.E. Computer Engineering', intake: base }, { programme: 'B.E. Mechanical Engineering', intake: 60 }],
    ter: { paid: h % 4 !== 0, ref: `TER-${inst.code}-${2025 + (h % 2)}` },
    deficiencyOpen: h % 3 === 0 ? 1 + (h % 2) : 0,
    affidavit: h % 6 !== 0,
    nocs: [
      { name: 'Fire NOC', ref: `FIRE/${inst.code}/${100 + (h % 800)}`, validUntil: fireExpiry },
      { name: 'State government NOC', ref: `NOC/${inst.state.slice(0, 3).toUpperCase()}/${2020 + (h % 5)}` },
    ],
  }
}

export interface RecRow { label: string; application: string; record: string; status: CheckStatus; note: string }

export function recordChecks(s: DemoState, app: Application): RecRow[] {
  const inst = s.institutions.find((i) => i.id === app.instId)!
  const docs = s.docs.filter((d) => d.appId === app.id)
  const fire = docs.find((d) => d.reqKey === 'FIRE')
  const rec = institutionRecord(inst, fire?.expiresOn)
  const intakeVal = s.extracted.find((e) => e.appId === app.id && e.field === 'Student intake')
  const applied = intakeVal ? Number(intakeVal.value.replace(/,/g, '')) : undefined
  const approvedTotal = rec.approved.reduce((n, a) => n + a.intake, 0) - (app.type === 'INTAKE' ? 60 : 0)
  const rows: RecRow[] = []
  rows.push({ label: 'Previous EoA', application: app.type === 'NEW' ? 'New institution' : 'Continuation claimed', record: `${rec.prevEoa.year}: ${rec.prevEoa.status}`, status: app.type === 'NEW' ? 'PENDING' : rec.prevEoa.status === 'Granted' ? 'VERIFIED' : 'MANUAL_REQUIRED', note: app.type === 'NEW' ? 'No prior approval expected.' : rec.prevEoa.status === 'Granted' ? 'Matches record.' : 'Conditions attached to previous approval; review.' })
  if (applied !== undefined) {
    const increase = app.type === 'INTAKE'
    rows.push({ label: 'Approved intake', application: `${applied} (extracted)`, record: `${approvedTotal} approved`, status: applied === approvedTotal || (increase && applied > approvedTotal) ? 'VERIFIED' : 'MISMATCH', note: increase ? 'Increase requested; must exceed the approved intake.' : applied === approvedTotal ? 'Matches approved intake.' : `Application states ${applied}; record shows ${approvedTotal}.` })
  } else rows.push({ label: 'Approved intake', application: 'Not yet extracted', record: `${approvedTotal} approved`, status: 'PENDING', note: 'Run verification to extract the declared intake.' })
  rows.push({ label: 'TER payment', application: '—', record: rec.ter.paid ? `Paid (${rec.ter.ref})` : `Pending (${rec.ter.ref})`, status: rec.ter.paid ? 'VERIFIED' : 'MANUAL_REQUIRED', note: rec.ter.paid ? 'Payment recorded.' : 'No payment recorded; confirm before scrutiny proceeds.' })
  rows.push({ label: 'Deficiency status', application: '—', record: rec.deficiencyOpen ? `${rec.deficiencyOpen} open deficiency item(s)` : 'None open', status: rec.deficiencyOpen ? 'MANUAL_REQUIRED' : 'VERIFIED', note: rec.deficiencyOpen ? 'Open deficiencies from earlier cycle.' : 'No pending deficiencies.' })
  rows.push({ label: 'Affidavit / undertaking', application: docs.length ? 'Submitted with application' : '—', record: rec.affidavit ? 'On file' : 'Not on file', status: rec.affidavit ? 'VERIFIED' : 'NOT_FOUND', note: rec.affidavit ? 'Affidavit present in records.' : 'No affidavit record found. Absence is not proof of non-compliance.' })
  rec.nocs.forEach((n) => {
    if (n.name === 'Fire NOC') {
      const doc = fire?.expiresOn
      const same = doc && Math.abs(new Date(doc).getTime() - new Date(n.validUntil ?? doc).getTime()) < 86400000 * 30
      rows.push({ label: 'Fire NOC', application: doc ? `valid until ${fmtDate(doc)}` : 'Not uploaded', record: `${n.ref}`, status: !doc ? 'PENDING' : same ? (new Date(doc) < new Date() ? 'EXPIRED' : 'VERIFIED') : 'MISMATCH', note: !doc ? 'No fire certificate uploaded.' : new Date(doc) < new Date() ? 'Certificate date has passed.' : 'Dates consistent with record.' })
    } else rows.push({ label: n.name, application: '—', record: n.ref, status: 'VERIFIED', note: 'Reference present in records.' })
  })
  return rows
}

export interface InfraThresholds { sqmPerStudent: number; studentsPerLab: number; libraryPerStudent: number }
export const DEFAULT_INFRA: InfraThresholds = { sqmPerStudent: 1.2, studentsPerLab: 40, libraryPerStudent: 0.25 }
export interface InfraRow { label: string; declared: string; required: string; status: CheckStatus; note: string; evidence: string }

export function infraChecks(s: DemoState, app: Application, t: InfraThresholds): { rows: InfraRow[]; inspect: boolean; reasons: string[] } {
  const docs = s.docs.filter((d) => d.appId === app.id)
  const h = seedNum(app.id)
  const students = 240
  const declared = { class: Math.round(students * 1.2 + ((h % 5) - 2) * 40), labs: Math.ceil(students / 40) - (h % 4 === 0 ? 2 : 0), lib: Math.round(students * 0.25 + ((h >> 3) % 3) * 20 - 30) }
  const has = (k: string) => docs.some((d) => d.reqKey === k)
  const plan = has('BLDG') || has('INFRA')
  const photos = has('PHOTO')
  const need = { class: Math.round(students * t.sqmPerStudent), labs: Math.ceil(students / t.studentsPerLab), lib: Math.round(students * t.libraryPerStudent) }
  const rows: InfraRow[] = [
    { label: 'Classroom area (sq m)', declared: String(declared.class), required: `≥ ${need.class}`, status: declared.class >= need.class ? 'VERIFIED' : 'MISMATCH', note: declared.class >= need.class ? 'Meets requirement.' : `Short by ${need.class - declared.class} sq m.`, evidence: plan ? 'Floor plan on file' : 'No floor plan' },
    { label: 'Laboratories', declared: String(declared.labs), required: `≥ ${need.labs}`, status: declared.labs >= need.labs ? 'VERIFIED' : 'MISMATCH', note: declared.labs >= need.labs ? 'Meets requirement.' : `${need.labs - declared.labs} laboratory(ies) short.`, evidence: has('INV') ? 'Equipment invoices on file' : 'No invoices' },
    { label: 'Library area (sq m)', declared: String(declared.lib), required: `≥ ${need.lib}`, status: declared.lib >= need.lib ? 'VERIFIED' : 'MANUAL_REQUIRED', note: declared.lib >= need.lib ? 'Meets requirement.' : 'Below requirement; additional evidence needed.', evidence: photos ? 'Campus photographs on file' : 'No photographs' },
    { label: 'Photographic evidence', declared: photos ? 'Provided' : 'Missing', required: 'Required', status: photos ? 'VERIFIED' : 'MANUAL_REQUIRED', note: photos ? 'Image check: 3 rooms detected, no obvious discrepancy.' : 'Upload campus photographs to enable the image check.', evidence: photos ? 'Image check' : '—' },
  ]
  const reasons = rows.filter((r) => r.status !== 'VERIFIED').map((r) => `${r.label}: ${r.note}`)
  return { rows, inspect: rows.some((r) => r.status === 'MISMATCH') || !plan, reasons: !plan ? ['No floor plan or infrastructure plan uploaded.', ...reasons] : reasons }
}
