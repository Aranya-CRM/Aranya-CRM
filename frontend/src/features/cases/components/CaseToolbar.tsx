import type { CaseDisplayStatus } from './CaseStatusBadge'

interface CaseToolbarProps {
  search: string
  status: string
  caseworker: string
  caseworkers: string[]
  statuses: CaseDisplayStatus[]
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onCaseworkerChange: (value: string) => void
}

const STATUS_LABELS: Record<CaseDisplayStatus, string> = {
  OPEN: 'Open',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  IN_REVIEW: 'In Review',
  SUSPENDED: 'Suspended',
  CLOSED: 'Closed',
}

export function CaseToolbar({
  search,
  status,
  caseworker,
  caseworkers,
  statuses,
  onSearchChange,
  onStatusChange,
  onCaseworkerChange,
}: CaseToolbarProps) {
  return (
    <div className="case-toolbar">
      <input
        className="search-input"
        type="text"
        placeholder="搜索个案或僧人 · Search..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <select
        className="case-filter-select"
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        aria-label="Filter by status"
      >
        <option value="all">全部状态 · All Status</option>
        {statuses.map((item) => (
          <option key={item} value={item}>{STATUS_LABELS[item]}</option>
        ))}
      </select>
      <select
        className="case-filter-select caseworker-select"
        value={caseworker}
        onChange={(event) => onCaseworkerChange(event.target.value)}
        aria-label="Filter by caseworker"
      >
        <option value="all">全部社工 · All Caseworkers</option>
        {caseworkers.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </div>
  )
}
