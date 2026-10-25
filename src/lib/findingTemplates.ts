import type { DocRecord, ExtractedValue, Finding, Strength } from '../types'
import { fmtDate } from './format'
import { seedNum } from './hash'

export const SCENARIOS = [['T1', 'T2', 'T6', 'T3'], ['T5', 'T7', 'T4', 'T6'], ['T10', 'T2', 'T9', 'T8']]
export const scenarioFor = (appId: string) => SCENARIOS[seedNum(appId) % SCENARIOS.length]

export interface FindingTemplate {
  id: string; checkId: string; title: string; severity: Finding['severity']; verdict: Finding['verdict']
  prefer: string[]; rule: string; source: string; simulated: boolean; strength: Strength
  confidence?: number; page?: number; lowConf?: boolean; action: string
  description: (d: DocRecord) => string
  evidence: (d: DocRecord) => string[]
}

const D = (iso?: string) => fmtDate(iso)

export const TEMPLATES: Record<string, FindingTemplate> = {
  T1: {
    id: 'T1', checkId: 'CHK-EXPIRY', title: 'Fire safety certificate expired', severity: 'HIGH', verdict: 'EXPIRED',
    prefer: ['FIRE'], rule: 'R-FIRE-01 · Handbook §4.3.2', source: 'Deterministic rule + simulated DigiLocker record',
    simulated: true, strength: 'L1', confidence: 0.96, page: 1,
    action: 'Upload a renewed fire safety certificate that is valid on the submission date.',
    description: (d) => `The certificate in “${d.name}” expired on ${D(d.expiresOn)}, before the submission date.`,
    evidence: (d) => [
      `Extracted expiry date: ${D(d.expiresOn)} (page 1, confidence 96%)`,
      'Rule R-FIRE-01: certificate must be valid on the submission date',
      'SIMULATED SOURCE RESPONSE: record found, status “Expired”',
    ],
  },
  T2: {
    id: 'T2', checkId: 'CHK-FAC-COUNT', title: 'Faculty count extracted with low confidence', severity: 'MEDIUM', verdict: 'MANUAL_REQUIRED',
    prefer: ['FAC'], rule: 'R-FAC-01 · Handbook §6.1', source: 'Simulated OCR extraction', simulated: true, strength: null,
    confidence: 0.62, page: 2, lowConf: true,
    action: 'Confirm the faculty count read from page 2, or re-upload a clearer scan.',
    description: (d) => `The faculty count in “${d.name}” was read with 62% confidence. The compliance rule is held until a human confirms the value.`,
    evidence: () => ['Extracted “Faculty count = 48” on page 2 (confidence 62%)', 'Gate 2: values below 80% cannot feed compliance rules until confirmed'],
  },
  T3: {
    id: 'T3', checkId: 'CHK-DUP-FAC', title: 'Potential duplicate faculty record', severity: 'HIGH', verdict: 'MANUAL_REQUIRED',
    prefer: ['FAC'], rule: 'R-DUP-01 · Handbook §9.1', source: 'Cross-college check (seeded dataset)', simulated: true, strength: null,
    confidence: 0.88, page: 3,
    action: 'Provide appointment letters and a declaration of full-time service for the listed faculty member.',
    description: () => 'A faculty entry shares a photo hash, birth year and name with a faculty record at another institution. This is a candidate match only.',
    evidence: () => ['“Dr. Anil Verma” — photo hash 9f3a…c21 matches faculty FAC-005 at another seeded institution', 'Birth year 1979 matches; designation differs', 'Candidate only — officer review required before treating as an issue'],
  },
  T4: {
    id: 'T4', checkId: 'CHK-DUP-PHOTO', title: 'Potentially reused campus photograph', severity: 'MEDIUM', verdict: 'MANUAL_REQUIRED',
    prefer: ['PHOTO'], rule: 'R-DUP-02 · Handbook §9.3', source: 'Perceptual-hash comparison (seeded dataset)', simulated: true, strength: null,
    confidence: 0.91, page: 1,
    action: 'Provide original, date-stamped photographs of the campus laboratories.',
    description: () => 'A laboratory photograph is 91% similar (perceptual hash) to a photograph in another institution’s application.',
    evidence: () => ['pHash distance 6/64 against photo in a seeded application of another institution', 'Similarity is an indicator requiring review, not proof of reuse'],
  },
  T5: {
    id: 'T5', checkId: 'CHK-INV-ARITH', title: 'Invoice arithmetic discrepancy', severity: 'HIGH', verdict: 'MISMATCH',
    prefer: ['INV', 'FIN'], rule: 'R-INV-01 · Handbook §7.4', source: 'Deterministic arithmetic check', simulated: false, strength: null,
    confidence: 0.94, page: 2,
    action: 'Provide a corrected invoice or vendor confirmation of the declared total.',
    description: () => 'Line items sum to ₹6,47,500 but the declared invoice total is ₹7,07,500 (difference ₹60,000).',
    evidence: () => ['Σ(qty × rate) = ₹6,47,500 (computed from seeded line items)', 'Declared total = ₹7,07,500', 'Difference = ₹60,000'],
  },
  T6: {
    id: 'T6', checkId: 'CHK-SRC-CCA', title: 'Signature source unavailable', severity: 'LOW', verdict: 'UNAVAILABLE',
    prefer: ['PREV', 'TRUST', 'FIN'], rule: 'R-SRC-01 · Handbook §8.2', source: 'Simulated CCA India adapter (timeout)', simulated: true, strength: null,
    action: 'No institution action required. An officer may retry later or verify manually.',
    description: () => 'The simulated CCA India adapter timed out. A timeout is reported as UNAVAILABLE, never as a mismatch.',
    evidence: () => ['SIMULATED SOURCE RESPONSE: timeout after 8s', 'No verification strength can be assigned'],
  },
  T7: {
    id: 'T7', checkId: 'CHK-FOR-HIDDEN', title: 'Hidden text layer indicator', severity: 'MEDIUM', verdict: 'MANUAL_REQUIRED',
    prefer: ['FIN', 'PREV', 'BLDG'], rule: 'R-FOR-01 · Handbook §10.1', source: 'Simulated forensic result', simulated: true, strength: null,
    confidence: 0.7, page: 2,
    action: 'Officer review of page 2; request the original issuer-signed document if needed.',
    description: () => 'Unusual structure: text exists beneath an image region on page 2. Heuristic indicator only; it is not proof of tampering.',
    evidence: () => ['SIMULATED FORENSIC RESULT: hidden text layer under region (x 120, y 340)', 'Additional verification recommended'],
  },
  T8: {
    id: 'T8', checkId: 'CHK-REC-LOOKUP', title: 'No matching record in source', severity: 'MEDIUM', verdict: 'NOT_FOUND',
    prefer: ['LAND', 'TRUST', 'PREV'], rule: 'R-TRUST-01 · Handbook §3.1', source: 'Simulated AICTE records adapter', simulated: true, strength: 'L4',
    confidence: 0.8, page: 1,
    action: 'Provide the registration reference or an issuer-attested copy.',
    description: () => 'The simulated record lookup returned no entry. A missing record does not mean the document is invalid.',
    evidence: () => ['SIMULATED SOURCE RESPONSE: 0 records for the extracted registration number'],
  },
  T9: {
    id: 'T9', checkId: 'CHK-QUALITY', title: 'Page requires rescanning', severity: 'LOW', verdict: 'MANUAL_REQUIRED',
    prefer: ['BLDG', 'LAND', 'INFRA'], rule: 'R-QLT-01 · Handbook §2.4', source: 'Simulated quality check', simulated: true, strength: null,
    confidence: 0.85, page: 3,
    action: 'Rescan page 3 at 300 DPI or higher and re-upload the document.',
    description: () => 'Page 3 appears blurred (simulated quality score 41/100).',
    evidence: () => ['SIMULATED quality score: 41/100 on page 3', 'Resolution indicator below 150 DPI equivalent'],
  },
  T10: {
    id: 'T10', checkId: 'CHK-AREA', title: 'Built-up area does not match sanctioned plan', severity: 'HIGH', verdict: 'MISMATCH',
    prefer: ['BLDG', 'INFRA'], rule: 'R-BLD-01 · Handbook §5.2', source: 'Deterministic rule on extracted values', simulated: false, strength: null,
    confidence: 0.9, page: 2,
    action: 'Reconcile the declared built-up area with the sanctioned plan or provide a revised plan approval.',
    description: () => 'Declared built-up area 4,200 sq m differs from 3,650 sq m in the sanctioned plan (page 2).',
    evidence: () => ['Declared: 4,200 sq m (application form)', 'Sanctioned plan: 3,650 sq m (page 2, confidence 90%)', 'Rule: declared area must not exceed sanctioned area'],
  },
}

export function pickDoc(t: FindingTemplate, docs: DocRecord[], i: number): DocRecord {
  return docs.find((d) => t.prefer.includes(d.reqKey)) ?? docs[i % docs.length]
}

export function buildFinding(id: string, appId: string, t: FindingTemplate, doc: DocRecord, createdAt: string, extractedId?: string): Finding {
  return {
    id, appId, docId: doc.id, checkId: t.checkId, title: t.title, severity: t.severity, status: 'OPEN',
    verdict: t.verdict, description: t.description(doc), page: t.page, rule: t.rule, confidence: t.confidence,
    source: t.source, simulated: t.simulated, strength: t.strength, action: t.action, evidence: t.evidence(doc),
    dependsOnValue: t.lowConf ? extractedId : undefined, createdAt,
  }
}

export function buildExtractions(prefix: string, appId: string, docs: DocRecord[], lowConf: boolean): ExtractedValue[] {
  const out: ExtractedValue[] = []
  let n = 1
  const push = (d: DocRecord, field: string, value: string, page: number, confidence: number) =>
    out.push({ id: `${prefix}-X${n++}`, appId, docId: d.id, field, value, page, confidence, confirmed: confidence >= 0.8 })
  for (const d of docs) {
    if (d.reqKey === 'FIRE') {
      push(d, 'Institution name', 'Registered institution name', 1, 0.97)
      push(d, 'Certificate number', `FSC/${d.id.slice(-4)}/2025`, 1, 0.93)
      push(d, 'Expiry date', D(d.expiresOn), 1, 0.96)
    } else if (d.reqKey === 'FAC') {
      push(d, 'Faculty count', '48', 2, lowConf ? 0.62 : 0.94)
      push(d, 'Student intake', '240', 1, 0.91)
    } else if (d.reqKey === 'BLDG' || d.reqKey === 'INFRA') {
      push(d, 'Declared built-up area', '4,200 sq m', 2, 0.9)
    } else {
      push(d, 'Reference number', `REF/${d.id.slice(-4)}`, 1, 0.9)
    }
  }
  return out
}
