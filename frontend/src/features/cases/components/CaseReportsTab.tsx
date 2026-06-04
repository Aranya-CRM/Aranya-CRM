import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { fetchReports } from '../../reports/api/report.api'
import type { ReportSummary } from '../../reports/types'
import type { Case } from '../types'

interface Props {
  caseData: Case
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return value.slice(0, 10)
}

function statusLabel(status: string | null | undefined, t: (k: string) => string): string {
  if (status === 'DRAFT') return t('reports.status.DRAFT')
  if (status === 'SUBMITTED') return t('reports.status.SUBMITTED')
  return t('reports.status.SUBMITTED')
}

export function CaseReportsTab({ caseData }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchReports({ mine: true })
      .then((data) => {
        if (!active) return
        const clientIdNum = Number(caseData.clientId)
        setReports(data.filter((r) => r.clientId === clientIdNum))
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [caseData.clientId])

  function handleNewReport() {
    navigate(`/reports/new?clientId=${caseData.clientId}`)
  }

  if (loading) {
    return <div className="case-reports-state">{t('common.loading')}</div>
  }

  return (
    <div className="case-reports-tab">
      <div className="case-reports-header">
        <span className="case-reports-count">
          {t('cases.reports.count', { count: reports.length })}
        </span>
        <button className="btn-primary" type="button" onClick={handleNewReport}>
          {t('cases.reports.newBtn')}
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="case-reports-state">{t('cases.reports.empty')}</div>
      ) : (
        <table className="case-reports-table">
          <thead>
            <tr>
              <th>{t('cases.reports.col.date')}</th>
              <th>{t('cases.reports.col.type')}</th>
              <th>{t('cases.reports.col.duration')}</th>
              <th>{t('cases.reports.col.submitter')}</th>
              <th>{t('cases.reports.col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {reports
              .slice()
              .sort((a, b) => (b.dateOfVisit ?? '').localeCompare(a.dateOfVisit ?? ''))
              .map((report) => (
                <tr
                  key={report.id}
                  className="case-reports-row"
                  onClick={() => navigate(`/reports?selected=${report.id}`)}
                >
                  <td>{formatDate(report.dateOfVisit)}</td>
                  <td>{report.typeOfVisit ?? '—'}</td>
                  <td>{report.durationOfVisit ?? '—'}</td>
                  <td>{report.createdByName ?? report.staffName ?? '—'}</td>
                  <td>
                    <span className={`case-report-status-pill ${(report.status ?? 'submitted').toLowerCase()}`}>
                      {statusLabel(report.status, t)}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
