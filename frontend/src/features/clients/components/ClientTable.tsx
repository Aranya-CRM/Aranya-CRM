import type { Client } from '../types'
import { EmptyTableRow, SectionCard, TableShell } from '../../../shared/ui'
import { MembershipBadge } from './MembershipBadge'

interface ClientTableProps {
  clients: Client[]
  loading: boolean
  canUpdateClient: boolean
  onView: (clientId: string) => void
  onEdit: (clientId: string) => void
}

export function ClientTable({
  clients,
  loading,
  canUpdateClient,
  onView,
  onEdit,
}: ClientTableProps) {
  return (
    <SectionCard className="client-list-card">
      <TableShell>
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
              <EmptyTableRow colSpan={7} message="加载中... / Loading..." />
            ) : clients.length === 0 ? (
              <EmptyTableRow colSpan={7} message="暂无数据 / No clients found" />
            ) : (
              clients.map((client) => (
                <tr key={client.id}>
                  <td><span className="cell-zh">{client.abbr}</span></td>
                  <td>
                    <span className="cell-zh">{client.nameChn}</span>
                    <span className="cell-en">{client.nameEn}</span>
                  </td>
                  <td><span className="cell-zh">{client.buddhistTradition}</span></td>
                  <td><span className="cell-zh">{client.ordinationStatus}</span></td>
                  <td><span className="cell-zh">{client.area}</span></td>
                  <td><MembershipBadge status={client.membershipStatus} /></td>
                  <td>
                    <div className="table-action-group">
                      <button className="action-link" type="button" onClick={() => onView(client.id)}>
                        <span className="cell-zh">{canUpdateClient ? '查看档案' : '查看信息'}</span>
                        <span className="cell-en">{canUpdateClient ? 'View Profile' : 'View Info'}</span>
                      </button>
                      {canUpdateClient ? (
                        <button className="action-link" type="button" onClick={() => onEdit(client.id)}>
                          <span className="cell-zh">编辑</span>
                          <span className="cell-en">Edit</span>
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </SectionCard>
  )
}
