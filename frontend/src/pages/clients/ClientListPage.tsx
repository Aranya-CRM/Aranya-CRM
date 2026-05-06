import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { fetchClients } from '../../services/client.api'
import type { Client } from '../../types/client'
import './clients.css'

function MembershipBadge({ status }: { status: Client['membershipStatus'] }) {
  const cls = 'membership-' + status.toLowerCase()
  return <span className={'membership-badge ' + cls}>{status}</span>
}

export function ClientListPage() {
  const { canFeature } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterTradition, setFilterTradition] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const canCreateClient = canFeature('clients.create')
  const canUpdateClient = canFeature('clients.update')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await fetchClients()
        if (active) setClients(data)
      } catch {
        // handled silently
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        c.nameChn.includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.abbr.toLowerCase().includes(q)
      const matchStatus = filterStatus === 'all' || c.membershipStatus === filterStatus
      const matchTradition = filterTradition === 'all' || c.buddhistTradition === filterTradition
      return matchSearch && matchStatus && matchTradition
    })
  }, [clients, search, filterStatus, filterTradition])

  return (
    <>
      <h2 className="page-title">僧人档案</h2>
      <div className="page-subtitle">Clients</div>

      <div className="client-toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="搜索法名、缩写... / Search name, abbr..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">全部状态 / All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Discharged">Discharged</option>
          <option value="Withdrawn">Withdrawn</option>
          <option value="Deceased">Deceased</option>
        </select>
        <select
          className="filter-select"
          value={filterTradition}
          onChange={(e) => setFilterTradition(e.target.value)}
        >
          <option value="all">全部传承 / All Traditions</option>
          <option value="Theravada">Theravada</option>
          <option value="Mahayana">Mahayana</option>
          <option value="Vajrayana">Vajrayana</option>
        </select>
        {canCreateClient && (
          <div className="toolbar-right">
            <button
              className="btn-primary"
              type="button"
              onClick={() => navigate('/clients/new')}
            >
              ＋ 新建僧人档案
            </button>
          </div>
        )}
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table>
            <colgroup>
              <col className="col-abbr" />
              <col className="col-name" />
              <col className="col-tradition" />
              <col className="col-ordination" />
              <col className="col-area" />
              <col className="col-membership" />
              <col className="col-client-actions" />
            </colgroup>
            <thead>
              <tr>
                <th><span className="th-zh">缩写</span><span className="th-en">Abbr</span></th>
                <th><span className="th-zh">法名</span><span className="th-en">Name</span></th>
                <th><span className="th-zh">传承</span><span className="th-en">Tradition</span></th>
                <th><span className="th-zh">戒别</span><span className="th-en">Ordination</span></th>
                <th><span className="th-zh">区域</span><span className="th-en">Area</span></th>
                <th><span className="th-zh">状态</span><span className="th-en">Status</span></th>
                <th><span className="th-zh">操作</span><span className="th-en">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="empty-state">加载中... / Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">暂无数据 / No clients found</td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td><span className="cell-zh">{c.abbr}</span></td>
                    <td>
                      <span className="cell-zh">{c.nameChn}</span>
                      <span className="cell-en">{c.nameEn}</span>
                    </td>
                    <td><span className="cell-zh">{c.buddhistTradition}</span></td>
                    <td><span className="cell-zh">{c.ordinationStatus}</span></td>
                    <td><span className="cell-zh">{c.area}</span></td>
                    <td><MembershipBadge status={c.membershipStatus} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="action-link"
                          type="button"
                          onClick={() => navigate(`/clients/${c.id}`)}
                        >
                          <span className="cell-zh">{canUpdateClient ? '查看档案' : '查看信息'}</span>
                          <span className="cell-en">{canUpdateClient ? 'View Profile' : 'View Info'}</span>
                        </button>
                        {canUpdateClient && (
                          <button
                            className="action-link"
                            type="button"
                            onClick={() => navigate(`/clients/${c.id}/edit`)}
                          >
                            <span className="cell-zh">编辑</span>
                            <span className="cell-en">Edit</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
