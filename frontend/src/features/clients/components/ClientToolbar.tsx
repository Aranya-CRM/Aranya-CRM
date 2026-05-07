import type { Client } from '../types'
import { Can } from '../../../shared/auth'

interface ClientToolbarProps {
  search: string
  filterStatus: string
  filterTradition: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onTraditionChange: (value: string) => void
  onCreate: () => void
}

const MEMBERSHIP_STATUSES: Array<Client['membershipStatus']> = [
  'Active',
  'Inactive',
  'Discharged',
  'Withdrawn',
  'Deceased',
]

const TRADITIONS: Array<Client['buddhistTradition']> = [
  'Theravada',
  'Mahayana',
  'Vajrayana',
]

export function ClientToolbar({
  search,
  filterStatus,
  filterTradition,
  onSearchChange,
  onStatusChange,
  onTraditionChange,
  onCreate,
}: ClientToolbarProps) {
  return (
    <div className="client-toolbar">
      <input
        className="search-input"
        type="text"
        placeholder="搜索法名、缩写... / Search name, abbr..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <select
        className="filter-select"
        value={filterStatus}
        onChange={(event) => onStatusChange(event.target.value)}
      >
        <option value="all">全部状态 / All Status</option>
        {MEMBERSHIP_STATUSES.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
      <select
        className="filter-select"
        value={filterTradition}
        onChange={(event) => onTraditionChange(event.target.value)}
      >
        <option value="all">全部传承 / All Traditions</option>
        {TRADITIONS.map((tradition) => (
          <option key={tradition} value={tradition}>{tradition}</option>
        ))}
      </select>
      <Can feature="clients.create">
        <div className="toolbar-right">
          <button className="btn-primary" type="button" onClick={onCreate}>
            ＋ 新建僧人档案
          </button>
        </div>
      </Can>
    </div>
  )
}
