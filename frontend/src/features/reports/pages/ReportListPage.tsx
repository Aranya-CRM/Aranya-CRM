import { useEffect, useMemo, useState } from 'react'
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

function displayName(report: ReportSummary): string {
  const zh = report.clientNameChn?.trim()
  const en = report.clientNameEn?.trim()

  if (zh && en) return `${zh} / ${en}`
  return zh || en || '未命名僧人 / Unnamed monastic'
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
          setErrorMessage('探访报告加载失败，请稍后重试。 / Failed to load reports.')
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
  }, [])

  const reportTypes = useMemo(() => uniqueTypes(reports), [reports])
  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase()

    return reports.filter((report) => {
      const matchesType = typeFilter === 'all' || report.typeOfVisit === typeFilter
      const matchesSearch =
        !q ||
        String(report.id).includes(q) ||
        displayName(report).toLowerCase().includes(q) ||
        displayText(report.createdByName).toLowerCase().includes(q) ||
        displayText(report.staffName).toLowerCase().includes(q) ||
        displayText(report.location).toLowerCase().includes(q)

      return matchesType && matchesSearch
    })
  }, [reports, search, typeFilter])

  async function handleDelete(report: ReportSummary) {
    const confirmed = window.confirm(`确认删除报告 RPT-${String(report.id).padStart(4, '0')}？ / Delete this report?`)
    if (!confirmed) return

    setDeletingId(report.id)
    setErrorMessage(undefined)

    try {
      await deleteReport(report.id)
      setReports((current) => current.filter((item) => item.id !== report.id))
    } catch {
      setErrorMessage('探访报告删除失败，请稍后重试。 / Failed to delete report.')
    } finally {
      setDeletingId(undefined)
    }
  }

  return (
    <div className="report-page">
      <PageHeader
        titleZh="探访报告"
        titleEn={`Reports · ${filteredReports.length} 份报告`}
        actions={(
          <button className="btn-primary" type="button" onClick={() => navigate('/reports/new')}>
            + 新增报告 · New Report
          </button>
        )}
      />

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <div className="report-toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="搜索僧人、提交人、地点 · Search reports..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="filter-select"
          value={typeFilter}
          aria-label="Filter by visit type"
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="all">探访类型 · All Types</option>
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
                <th><span className="th-zh">报告编号</span><span className="th-en">Report ID</span></th>
                <th><span className="th-zh">僧人</span><span className="th-en">Client</span></th>
                <th><span className="th-zh">提交人</span><span className="th-en">Created By</span></th>
                <th><span className="th-zh">探访日期</span><span className="th-en">Visit Date</span></th>
                <th><span className="th-zh">探访类型</span><span className="th-en">Visit Type</span></th>
                <th><span className="th-zh">提交时间</span><span className="th-en">Created At</span></th>
                <th><span className="th-zh">操作</span><span className="th-en">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="report-table-state">加载中 · Loading...</td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="report-table-state">暂无探访报告 · No reports found</td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <span className="report-id">RPT-{String(report.id).padStart(4, '0')}</span>
                    </td>
                    <td>
                      <span className="cell-strong">{displayName(report)}</span>
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
                          className="report-view-link"
                          type="button"
                          onClick={() => navigate(`/reports/${report.id}`)}
                        >
                          查看 · View
                        </button>
                        <button
                          className="report-delete-link"
                          type="button"
                          disabled={deletingId === report.id}
                          onClick={() => void handleDelete(report)}
                        >
                          删除 · Delete
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
