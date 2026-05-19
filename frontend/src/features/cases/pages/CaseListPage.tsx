import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccess } from '../../../shared/auth'
import { PageHeader } from '../../../shared/ui'
import {
  CaseTable,
  CaseToolbar,
  type CaseListRow,
} from '../components'
import { useCases } from '../hooks'
import type { Case, CaseColorCode } from '../types'
import './cases.css'

const COLOR_ORDER: Record<CaseColorCode, number> = {
  RED: 1,
  ORANGE: 2,
  YELLOW: 3,
  GREEN: 4,
  GREY: 5,
  BLACK: 6,
}

export function CaseListPage() {
  const navigate = useNavigate()
  const { canFeature } = useAccess()
  const { data: cases = [], isLoading } = useCases()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [caseworkerFilter, setCaseworkerFilter] = useState<string>('all')

  const rows = useMemo(() => {
    return cases.map(toCaseListRow).sort((a, b) => {
      const colorDiff = COLOR_ORDER[a.colorCode] - COLOR_ORDER[b.colorCode]
      if (colorDiff !== 0) return colorDiff
      return b.dateOpened.localeCompare(a.dateOpened)
    })
  }, [cases])

  const statuses = useMemo(() => unique(rows.map((item) => item.status)), [rows])
  const caseworkers = useMemo(() => unique(rows.map((item) => item.socialWorker).filter(Boolean)), [rows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()

    return rows.filter((item) => {
      const matchesSearch =
        !q ||
        item.caseNo.toLowerCase().includes(q) ||
        item.clientNameChn.includes(q) ||
        item.clientNameEn.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesCaseworker = caseworkerFilter === 'all' || item.socialWorker === caseworkerFilter
      return matchesSearch && matchesStatus && matchesCaseworker
    })
  }, [rows, search, statusFilter, caseworkerFilter])

  return (
    <div className="case-page">
      <PageHeader
        titleZh="个案管理"
        titleEn={`Case Management · ${filteredRows.length} 个个案`}
        actions={(
          <div className="case-header-actions">
            <button className="btn-audit" type="button">
              审计视图 · Audit View
            </button>
            {canFeature('cases.create') ? (
              <button className="btn-primary" type="button" onClick={() => navigate('/cases/new')}>
                + 新建个案 · New Case
              </button>
            ) : null}
          </div>
        )}
      />

      <CaseToolbar
        search={search}
        status={statusFilter}
        caseworker={caseworkerFilter}
        caseworkers={caseworkers}
        statuses={statuses}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onCaseworkerChange={setCaseworkerFilter}
      />

      <CaseTable
        cases={filteredRows}
        loading={isLoading}
        onView={(caseId) => navigate(`/cases/${caseId}`)}
        onAudit={(caseId) => navigate(`/cases/${caseId}?mode=audit`)}
      />
    </div>
  )
}

function toCaseListRow(item: Case): CaseListRow {
  return {
    id: item.id,
    caseNo: item.caseNo.replaceAll('_', '/'),
    dateOpened: item.dateOpened,
    clientNameChn: item.clientNameChn,
    clientNameEn: item.clientNameEn,
    tradition: item.tradition,
    socialWorker: item.socialWorker,
    status: item.status,
    colorCode: item.colorCode,
  }
}

function unique<T extends string>(items: T[]): T[] {
  return Array.from(new Set(items))
}
