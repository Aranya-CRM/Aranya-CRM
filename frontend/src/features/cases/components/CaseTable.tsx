import { useTranslation } from 'react-i18next'
import { EmptyTableRow, SectionCard, TableShell } from '../../../shared/ui'
import type { CaseColorCode } from '../types'
import { CaseIntensityDot } from './CaseIntensityDot'
import { CaseStatusBadge, type CaseDisplayStatus } from './CaseStatusBadge'

export interface CaseListRow {
  id: string
  caseNo: string
  dateOpened: string
  lastModifiedAt?: string
  clientAbbr?: string
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
}

export function CaseTable({ cases, loading, onView }: CaseTableProps) {
  const { t } = useTranslation()

  return (
    <SectionCard className="case-list-card">
      <TableShell>
        <table className="case-table">
          <colgroup>
            <col className="case-col-intensity" />
            <col className="case-col-client" />
            <col className="case-col-tradition" />
            <col className="case-col-status" />
            <col className="case-col-opened" />
          </colgroup>
          <thead>
            <tr>
              <th>{t('cases.table.intensity')}</th>
              <th>{t('cases.table.monastic')}</th>
              <th>{t('cases.table.caseNo')}</th>
              <th>{t('cases.table.status')}</th>
              <th>{t('cases.table.lastUpdated')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <EmptyTableRow colSpan={5} message={t('cases.table.loading')} />
            ) : cases.length === 0 ? (
              <EmptyTableRow colSpan={5} message={t('cases.table.empty')} />
            ) : (
              cases.map((item) => (
                <tr
                  key={item.id}
                  className={`case-row-clickable${item.status === 'CLOSED' ? ' case-row-closed' : ''}`}
                  onClick={() => onView(item.id)}
                >
                  <td><CaseIntensityDot colorCode={item.colorCode} /></td>
                  <td>
                    <span className="case-cell-main">{item.clientAbbr || item.clientNameEn || item.clientNameChn || '-'}</span>
                  </td>
                  <td><span className="case-cell-main">{item.caseNo}</span></td>
                  <td><CaseStatusBadge status={item.status} /></td>
                  <td><span className="case-cell-main">{item.lastModifiedAt ?? item.dateOpened}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </SectionCard>
  )
}
