import { useMemo } from 'react'
import type { AppStatus, Application } from '../types'
import { currentUser, useStore } from './store'

export function useMyInstitution() {
  const s = useStore()
  const u = currentUser(s)
  return s.institutions.find((i) => i.id === u?.instId)
}

export function useMyApps(): Application[] {
  const s = useStore()
  const u = currentUser(s)
  return useMemo(() => s.apps.filter((a) => a.instId === u?.instId), [s.apps, u?.instId])
}

export const STATUS_GROUPS: Record<string, { label: string; set: AppStatus[] }> = {
  draft: { label: 'Draft', set: ['DRAFT'] },
  verifying: { label: 'Under verification', set: ['SUBMITTED', 'PROCESSING'] },
  review: { label: 'Awaiting officer review', set: ['AWAITING_HUMAN_REVIEW', 'IN_SCRUTINY', 'RESUBMITTED'] },
  rectify: { label: 'Rectification required', set: ['RECTIFICATION_REQUESTED'] },
  completed: { label: 'Checks completed / recommended', set: ['RECOMMENDATION_RECORDED'] },
}
