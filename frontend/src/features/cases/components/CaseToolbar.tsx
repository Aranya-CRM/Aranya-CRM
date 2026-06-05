import { useTranslation } from 'react-i18next'
import type { CaseDisplayStatus } from './CaseStatusBadge'

interface CaseToolbarProps {
  search: string
  status: string
  statuses: CaseDisplayStatus[]
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
}

export function CaseToolbar({
  search,
  status,
  statuses,
  onSearchChange,
  onStatusChange,
}: CaseToolbarProps) {
  const { t } = useTranslation()
  return (
    <div className="case-toolbar">
      <input
        className="search-input"
        type="text"
        placeholder={t('cases.filter.search')}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <select
        className="case-filter-select"
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        aria-label="Filter by status"
      >
        <option value="all">{t('cases.filter.allStatus')}</option>
        {statuses.map((item) => (
          <option key={item} value={item}>{t(`cases.status.${item}`)}</option>
        ))}
      </select>
    </div>
  )
}
