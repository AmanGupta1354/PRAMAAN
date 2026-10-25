import type { Application, DemoState, Severity } from '../types'
import { SEVERITY_ORDER } from './format'

const unresolved = (st: string) => st !== 'DISMISSED' && st !== 'RESOLVED'

export function appStats(s: DemoState, a: Application) {
  const fs = s.findings.filter((f) => f.appId === a.id)
  const open = fs.filter((f) => unresolved(f.status))
  const bySev = (v: Severity) => open.filter((f) => f.severity === v).length
  const maxSev = open.length ? open.map((f) => f.severity).sort((x, y) => SEVERITY_ORDER[x] - SEVERITY_ORDER[y])[0] : null
  const expired = s.docs.filter((d) => d.appId === a.id && d.status === 'EXPIRED').length
  const priority = bySev('HIGH') * 10 + bySev('MEDIUM') * 4 + bySev('LOW') + expired * 5 + (a.status === 'RESUBMITTED' ? 3 : 0)
  return { total: fs.length, open: open.length, high: bySev('HIGH'), medium: bySev('MEDIUM'), low: bySev('LOW'), maxSev, expired, priority }
}

export const REVIEW_STATES = ['AWAITING_HUMAN_REVIEW', 'IN_SCRUTINY', 'RESUBMITTED'] as const
