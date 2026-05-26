import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorBanner, PageHeader, SectionCard, TableShell } from '../../../shared/ui'
import { deleteReport, fetchReports } from '../api/report.api'
import type { ReportSummary } from '../types'
import './reports.css'

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

function displayName(report: ReportSummary, isZh: boolean): string {
  const zh = report.clientNameChn?.trim()
  const en = report.clientNameEn?.trim()

  if (isZh) return zh || en || ''
  return en || zh || ''
}

function displayText(value: string | null | undefined, fallback = '-'): string {
  return value?.trim() || fallback
}

function uniqueTypes(reports: ReportSummary[]): string[] {
  return Array.from(
    new Set(
      reports
        .map((report) => report.typeOfVisit?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  )
}

export function ReportListPage() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const navigate = useNavigate()
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [deletingId, setDeletingId] = useState<number>()

  useEffect(() => {
    let active = true

    async function loadReports() {
      setIsLoading(true)

      try {
        const data = await fetchReports()
        if (active) {
          setReports(data)
          setErrorMessage(undefined)
        }
      } catch {
        if (active) {
          setErrorMessage(t('reports.list.loadError'))
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadReports()

    return () => {
      active = false
    }
  }, [t])

  const reportTypes = useMemo(() => uniqueTypes(reports), [reports])
  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase()

    return reports.filter((report) => {
      const matchesType = typeFilter === 'all' || report.typeOfVisit === typeFilter
      const matchesSearch =
        !q ||
        String(report.id).includes(q) ||
        displayName(report, isZh).toLowerCase().includes(q) ||
        displayText(report.createdByName).toLowerCase().includes(q) ||
        displayText(report.staffName).toLowerCase().includes(q) ||
        displayText(report.location).toLowerCase().includes(q)

      return matchesType && matchesSearch
    })
  }, [reports, search, typeFilter, isZh])

  async function handleDelete(report: ReportSummary) {
    const confirmed = window.confirm(t('reports.list.confirmDelete', { id: String(report.id).padStart(4, '0') }))
    if (!confirmed) return

    setDeletingId(report.id)
    setErrorMessage(undefined)

    try {
      await deleteReport(report.id)
      setReports((current) => current.filter((item) => item.id !== report.id))
    } catch {
      setErrorMessage(t('reports.list.deleteError'))
    } finally {
      setDeletingId(undefined)
    }
  }

  return (
    <div className="report-page">
      <PageHeader
        title={t('reports.list.title')}
        subtitle={t('reports.list.count', { count: filteredReports.length })}
        actions={(
          <button className="btn-primary" type="button" onClick={() => navigate('/reports/new')}>
            {t('reports.list.newBtn')}
          </button>
        )}
      />

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <div className="report-toolbar">
        <input
          className="search-input"
          type="text"
          placeholder={t('reports.list.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="filter-select"
          value={typeFilter}
          aria-label="Filter by visit type"
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="all">{t('reports.list.allTypes')}</option>
          {reportTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <SectionCard className="report-list-card" ariaLabel="Reports list">
        <TableShell>
          <table className="report-table">
            <colgroup>
              <col className="col-report-id" />
              <col className="col-report-client" />
              <col className="col-report-created-by" />
              <col className="col-report-visit-date" />
              <col className="col-report-type" />
              <col className="col-report-created-at" />
              <col className="col-report-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>{t('reports.list.colId')}</th>
                <th>{t('reports.list.colClient')}</th>
                <th>{t('reports.list.colCreatedBy')}</th>
                <th>{t('reports.list.colVisitDate')}</th>
                <th>{t('reports.list.colVisitType')}</th>
                <th>{t('reports.list.colCreatedAt')}</th>
                <th>{t('reports.list.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="report-table-state">{t('reports.list.loading')}</td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="report-table-state">{t('reports.list.empty')}</td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="report-row-clickable" onClick={() => navigate(`/reports/${report.id}`)}>
                    <td>
                      <span className="report-id">RPT-{String(report.id).padStart(4, '0')}</span>
                    </td>
                    <td>
                      <span className="cell-strong">{displayName(report, isZh) || t('reports.unnamedMonastic')}</span>
                    </td>
                    <td>
                      <span className="cell-main">{displayText(report.createdByName ?? report.staffName, 'Unknown')}</span>
                    </td>
                    <td>
                      <span className="cell-main">{formatDate(report.dateOfVisit)}</span>
                      {report.timeOfVisit ? <span className="cell-muted">{report.timeOfVisit}</span> : null}
                    </td>
                    <td>
                      <span className="report-type-pill">{displayText(report.typeOfVisit, 'Visit')}</span>
                    </td>
                    <td>
                      <span className="cell-main">{formatDate(report.createdAt ?? report.reportTimestamp)}</span>
                    </td>
                    <td>
                      <div className="report-row-actions">
                        <button
                          className="report-delete-link"
                          type="button"
                          disabled={deletingId === report.id}
                          onClick={(e) => { e.stopPropagation(); void handleDelete(report) }}
                        >
                          {t('reports.list.delete')}
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
    </div>
  )
}
