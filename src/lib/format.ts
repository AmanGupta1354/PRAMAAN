import type { AppStatus, AppType, CheckStatus, FindingStatus, Role, Severity } from '../types'

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
export const fmtDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
export const fmtSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`
export const daysUntil = (iso?: string) =>
  iso ? Math.round((new Date(iso).getTime() - Date.now()) / 86400000) : undefined
export const short = (h: string, n = 12) => (h.length > n ? `${h.slice(0, n)}…` : h)

export const APP_TYPE_LABEL: Record<AppType, string> = {
  NEW: 'New Institution', EXT: 'Extension of Approval', INTAKE: 'Increase in Intake',
}
export const APP_STATUS_LABEL: Record<AppStatus, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', PROCESSING: 'Verification running',
  AWAITING_HUMAN_REVIEW: 'Awaiting officer review', IN_SCRUTINY: 'In scrutiny',
  RECTIFICATION_REQUESTED: 'Rectification requested', RESUBMITTED: 'Resubmitted',
  RECOMMENDATION_RECORDED: 'Recommendation recorded',
}
export const CHECK_LABEL: Record<CheckStatus, string> = {
  PENDING: 'Pending', VERIFIED: 'Verified', MISMATCH: 'Mismatch', EXPIRED: 'Expired',
  NOT_FOUND: 'Not found', UNAVAILABLE: 'Unavailable', MANUAL_REQUIRED: 'Manual review',
}
export const FINDING_LABEL: Record<FindingStatus, string> = {
  OPEN: 'Open', ACCEPTED: 'Accepted', DISMISSED: 'Dismissed', ESCALATED: 'Escalated',
  NEEDS_EVIDENCE: 'Evidence requested', RESOLVED: 'Resolved',
}
export const SEVERITY_ORDER: Record<Severity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
export const ROLE_LABEL: Record<Role, string> = {
  institution: 'Institution Representative', scrutiny: 'Scrutiny Officer',
  senior: 'Senior Officer', admin: 'Administrator', auditor: 'Auditor',
}
export const STRENGTH_LABEL: Record<string, string> = {
  L1: 'L1 · Issuer document via DigiLocker', L2: 'L2 · Signature chain validated',
  L3: 'L3 · QR/reference on allow-listed domain', L4: 'L4 · Matched to AICTE/NAAC/NBA record',
  L5: 'L5 · Manual officer verification',
}
