import { useTranslation } from 'react-i18next'
import type { CaseStatus } from '../types'

export type CaseDisplayStatus = CaseStatus | 'WEEKLY' | 'MONTHLY' | 'IN_REVIEW'

export function CaseStatusBadge({ status }: { status: CaseDisplayStatus }) {
  const { t } = useTranslation()
  return (
    <span className={`case-status-badge case-status-${status.toLowerCase().replace('_', '-')}`}>
      {t(`cases.status.${status}`)}
    </span>
  )
}
