export type Role = 'institution' | 'scrutiny' | 'senior' | 'admin' | 'auditor'
export type AppType = 'NEW' | 'EXT' | 'INTAKE'
export type AppStatus =
  | 'DRAFT' | 'SUBMITTED' | 'PROCESSING' | 'AWAITING_HUMAN_REVIEW' | 'IN_SCRUTINY'
  | 'RECTIFICATION_REQUESTED' | 'RESUBMITTED' | 'RECOMMENDATION_RECORDED'
export type CheckStatus = 'PENDING' | 'VERIFIED' | 'MISMATCH' | 'EXPIRED' | 'NOT_FOUND' | 'UNAVAILABLE' | 'MANUAL_REQUIRED'
export type FindingStatus = 'OPEN' | 'ACCEPTED' | 'DISMISSED' | 'ESCALATED' | 'NEEDS_EVIDENCE' | 'RESOLVED'
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW'
export type RulesetStatus = 'DRAFT' | 'PREVIEWED' | 'APPROVED' | 'ACTIVE' | 'RETIRED'
export type Strength = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | null

export interface Institution {
  id: string; name: string; city: string; state: string; code: string
}

export interface Requirement {
  key: string; name: string; mandatory: boolean; formats: string[]; clause: string
}

export interface Application {
  id: string; instId: string; type: AppType; session: string
  createdAt: string; submittedAt?: string; status: AppStatus
  notes: string[]; recommendation?: { text: string; by: string; at: string }
  verifiedOnce?: boolean; lastRunAt?: string
  timeline: { at: string; label: string; actor: string }[]
}

export interface DocVersion {
  version: number; fileName: string; size: number; fingerprint: string; uploadedAt: string
  pages?: number; expiresOn?: string; note?: string
}

export interface DocRecord {
  id: string; appId: string; reqKey: string; name: string
  fileName: string; size: number; mime: string; fingerprint: string
  pages?: number; width?: number; height?: number
  uploadedAt: string; source: 'SEED_SAMPLE' | 'BROWSER_UPLOAD' | 'DEMO_SAMPLE'
  version: number; history: DocVersion[]; analysis?: import('../lib/deepAnalyze').DeepAnalysis
  status: CheckStatus; expiresOn?: string; needsRerun?: boolean
}

export interface ExtractedValue {
  id: string; appId: string; docId: string; field: string; value: string
  page: number; confidence: number; confirmed: boolean
}

export interface Finding {
  id: string; appId: string; docId?: string; checkId: string
  title: string; severity: Severity; status: FindingStatus; verdict: CheckStatus
  description: string; page?: number; rule: string; confidence?: number
  source: string; simulated: boolean; strength: Strength; action: string
  evidence: string[]; dependsOnValue?: string
  decision?: { by: string; at: string; reason?: string; action: string }
  createdAt: string
}

export interface Notice {
  id: string; appId: string; text: string; approved: boolean
  approvedBy?: string; approvedAt?: string; createdAt: string
}

export interface Notification {
  id: string; instId?: string; appId?: string; kind: string; title: string
  body: string; at: string; read: boolean
}

export interface AuditEntry {
  id: number; at: string; actor: string; role: string; action: string
  target: string; detail: string; prevHash: string; hash: string
}

export interface ProofSlip {
  id: string; appId: string; instId: string; instCode: string; type: AppType
  issuedAt: string; rulesetVersion: string; officerDecision: string
  checks: { name: string; status: CheckStatus; strength: Strength; simulated: boolean }[]
  auditRef: number; digest: string
}

export interface Rule {
  id: string; clause: string; text: string; param?: { label: string; value: number; unit: string }
}

export interface Ruleset {
  id: string; name: string; version: string; status: RulesetStatus
  expiryWarnDays: number; minFacultyRatio: number; rules: Rule[]
  createdAt: string; previewedAt?: string; approvedBy?: string; activatedAt?: string
  impact?: { docsFlagged: number; docsFlaggedActive: number; appsAffected: number }
}

export interface DemoUser {
  id: string; name: string; email: string; role: Role; active: boolean; instId?: string
}

export interface SourceAdapter {
  id: string; name: string; kind: string; status: 'SIMULATED' | 'UNAVAILABLE'; strength: Strength; note: string
}

export interface FacultyRecord {
  id: string; name: string; instId: string; designation: string; qualification: string
  dobYear: number; photoHash: string; panLike: string
}

export interface InvoiceRecord {
  id: string; instId: string; vendor: string; invoiceNo: string
  lines: { item: string; qty: number; rate: number }[]; declaredTotal: number
}

export interface Session { role: Role; userId: string }

export interface DemoState {
  v: number
  session: Session | null
  institutions: Institution[]
  checklists: Record<AppType, Requirement[]>
  apps: Application[]
  docs: DocRecord[]
  extracted: ExtractedValue[]
  findings: Finding[]
  notices: Notice[]
  notifications: Notification[]
  audit: AuditEntry[]
  proofs: ProofSlip[]
  rulesets: Ruleset[]
  users: DemoUser[]
  sources: SourceAdapter[]
  faculty: FacultyRecord[]
  invoices: InvoiceRecord[]
  seq: number
}
