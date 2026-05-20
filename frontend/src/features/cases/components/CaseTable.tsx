import { EmptyTableRow, SectionCard, TableShell } from '../../../shared/ui'
import type { CaseColorCode } from '../types'
import { CaseIntensityDot } from './CaseIntensityDot'
import { CaseStatusBadge, type CaseDisplayStatus } from './CaseStatusBadge'

export interface CaseListRow {
  id: string
  caseNo: string
  dateOpened: string
  clientNameChn: string
  clientNameEn: string
  tradition: string
  socialWorker: string
  status: CaseDisplayStatus
  colorCode: CaseColorCode
}

interface CaseTableProps {
  cases: CaseListRow[]
  loading: boolean
  onView: (caseId: string) => void
  onAudit: (caseId: string) => void
}

export function CaseTable({ cases, loading, onView, onAudit }: CaseTableProps) {
  return (
    <SectionCard className="case-list-card">
      <TableShell>
        <table className="case-table">
          <colgroup>
            <col className="case-col-intensity" />
            <col className="case-col-no" />
            <col className="case-col-client" />
            <col className="case-col-tradition" />
            <col className="case-col-worker" />
            <col className="case-col-status" />
            <col className="case-col-opened" />
            <col className="case-col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th><span className="case-th-zh">强度</span><span className="case-th-en">Intensity</span></th>
              <th><span className="case-th-zh">个案编号</span><span className="case-th-en">Case No.</span></th>
              <th><span className="case-th-zh">僧人</span><span className="case-th-en">Monastic</span></th>
              <th><span className="case-th-zh">传承</span><span className="case-th-en">Tradition</span></th>
              <th><span className="case-th-zh">主要社工</span><span className="case-th-en">Caseworker</span></th>
              <th><span className="case-th-zh">状态</span><span className="case-th-en">Status</span></th>
              <th><span className="case-th-zh">开案日期</span><span className="case-th-en">Opened</span></th>
              <th><span className="case-th-zh">操作</span><span className="case-th-en">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <EmptyTableRow colSpan={8} message="加载中... / Loading..." />
            ) : cases.length === 0 ? (
              <EmptyTableRow colSpan={8} message="暂无匹配个案 / No cases found" />
            ) : (
              cases.map((item) => (
                <tr key={item.id} className={item.status === 'CLOSED' ? 'case-row-closed' : undefined}>
                  <td><CaseIntensityDot colorCode={item.colorCode} /></td>
                  <td><span className="case-cell-main">{item.caseNo}</span></td>
                  <td>
                    <span className="case-cell-main">{item.clientNameChn}</span>
                    <span className="case-cell-sub">Ven. {item.clientNameEn}</span>
                  </td>
                  <td><span className="case-cell-main">{item.tradition}</span></td>
                  <td><span className="case-cell-main">{item.socialWorker}</span></td>
                  <td><CaseStatusBadge status={item.status} /></td>
                  <td><span className="case-cell-main">{item.dateOpened}</span></td>
                  <td>
                    <div className="case-action-group">
                      <button className="case-action-link" type="button" onClick={() => onView(item.id)}>
                        查看 · View
                      </button>
                      <button className="case-action-link" type="button" onClick={() => onAudit(item.id)}>
                        审计 · Audit
                      </button>
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
