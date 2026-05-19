import type { CaseStatus } from '../types'

export type CaseDisplayStatus = CaseStatus | 'WEEKLY' | 'MONTHLY' | 'IN_REVIEW'

const STATUS_LABELS: Record<CaseDisplayStatus, string> = {
  OPEN: 'OPEN',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  IN_REVIEW: 'IN REVIEW',
  SUSPENDED: 'SUSPENDED',
  CLOSED: 'CLOSED',
}

export function CaseStatusBadge({ status }: { status: CaseDisplayStatus }) {
  return (
    <span className={`case-status-badge case-status-${status.toLowerCase().replace('_', '-')}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
