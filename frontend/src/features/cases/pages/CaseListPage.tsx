import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { resolve } = useAccess()
  const { data: cases = [], isLoading } = useCases()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const rows = useMemo(() => {
    return cases.map(toCaseListRow).sort((a, b) => {
      const colorDiff = COLOR_ORDER[a.colorCode] - COLOR_ORDER[b.colorCode]
      if (colorDiff !== 0) return colorDiff
      return b.dateOpened.localeCompare(a.dateOpened)
    })
  }, [cases])

  const statuses = useMemo(() => unique(rows.map((item) => item.status)), [rows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()

    return rows.filter((item) => {
      const matchesSearch =
        !q ||
        item.caseNo.toLowerCase().includes(q) ||
        (item.clientAbbr ?? '').toLowerCase().includes(q) ||
        item.clientNameChn.includes(q) ||
        item.clientNameEn.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [rows, search, statusFilter])

  return (
    <div className="case-page">
      <PageHeader
        title={t('nav.cases')}
        subtitle={t('cases.list.count', { count: filteredRows.length })}
        actions={resolve('cases:create') ? (
          <button className="btn-primary" type="button" onClick={() => navigate('/cases/new')}>
            {t('cases.list.newCase')}
          </button>
        ) : undefined}
      />

      <CaseToolbar
        search={search}
        status={statusFilter}
        statuses={statuses}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
      />

      <CaseTable
        cases={filteredRows}
        loading={isLoading}
        onView={(caseId) => navigate(`/cases/${caseId}`)}
      />
    </div>
  )
}

function toCaseListRow(item: Case): CaseListRow {
  return {
    id: item.id,
    caseNo: item.caseNo.replaceAll('_', '/'),
    dateOpened: item.dateOpened,
    lastModifiedAt: item.lastModifiedAt,
    clientAbbr: item.clientAbbr,
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
