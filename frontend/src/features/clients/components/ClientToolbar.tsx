import type { Client } from '../types'
import { Can } from '../../../shared/auth'

interface ClientToolbarProps {
  search: string
  filterTradition: string
  onSearchChange: (value: string) => void
  onTraditionChange: (value: string) => void
  onCreate: () => void
}

const TRADITIONS: Array<Client['buddhistTradition']> = [
  'Theravada',
  'Mahayana',
  'Vajrayana',
]

export function ClientToolbar({
  search,
  filterTradition,
  onSearchChange,
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
