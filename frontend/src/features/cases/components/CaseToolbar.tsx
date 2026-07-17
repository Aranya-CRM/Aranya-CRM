import { useTranslation } from 'react-i18next'
import type { CaseDisplayStatus } from './CaseStatusBadge'

interface CaseToolbarProps {
  search: string
  status: string
  statuses: CaseDisplayStatus[]
  owner: string
  showOwnerFilter: boolean
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onOwnerChange: (value: string) => void
}

export function CaseToolbar({
  search,
  status,
  statuses,
  owner,
  showOwnerFilter,
  onSearchChange,
  onStatusChange,
  onOwnerChange,
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
        aria-label={t('cases.filter.statusLabel')}
      >
        <option value="all">{t('cases.filter.allStatus')}</option>
        {statuses.map((item) => (
          <option key={item} value={item}>{t(`cases.status.${item}`)}</option>
        ))}
      </select>
      {showOwnerFilter ? (
        <select
          className="case-filter-select caseworker-select"
          value={owner}
          onChange={(event) => onOwnerChange(event.target.value)}
          aria-label={t('cases.filter.ownerLabel')}
        >
          <option value="all">{t('cases.filter.allOwners')}</option>
          <option value="mine">{t('cases.filter.myCases')}</option>
          <option value="others">{t('cases.filter.otherCases')}</option>
        </select>
      ) : null}
    </div>
  )
}
