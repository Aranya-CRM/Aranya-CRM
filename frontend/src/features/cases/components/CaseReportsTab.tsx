import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { deleteReport, fetchReportById, fetchReports } from '../../reports/api/report.api'
import { isSubmittedReport, reportStatusKey } from '../../reports/reportStatus'
import type { ReportDetail, ReportSummary } from '../../reports/types'
import type { Case } from '../types'

interface Props {
  caseData: Case
  isManager: boolean
  readOnly?: boolean
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return value.slice(0, 10)
}

function statusLabel(status: string | null | undefined, t: (k: string) => string): string {
  return t(`reports.status.${reportStatusKey(status)}`)
}

function reportBelongsToCase(report: ReportSummary, caseData: Case): boolean {
  if (report.caseId != null && String(report.caseId) === String(caseData.id)) return true
  if (report.clientId != null && String(report.clientId) === String(caseData.clientId)) return true
  if (report.clientAbbr && caseData.clientAbbr && report.clientAbbr === caseData.clientAbbr) return true
  return false
}

function isVisibleCaseReport(report: ReportSummary): boolean {
  return isSubmittedReport(report.status)
}

export function CaseReportsTab({ caseData, isManager, readOnly = false }: Props) {
  const { t } = useTranslation()
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [deletingReport, setDeletingReport] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchReports({ mine: !isManager, caseId: caseData.id })
      .then((data) => {
        if (!active) return
        setReports(data.filter((report) => reportBelongsToCase(report, caseData) && isVisibleCaseReport(report)))
        setSelectedReport(null)
        setErrorMessage(undefined)
      })
      .catch(() => { if (active) setErrorMessage(t('reports.list.loadError')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [caseData, isManager, t])

  async function openReport(reportId: number) {
    setLoadingDetail(true)
    setErrorMessage(undefined)
    try {
      const detail = await fetchReportById(reportId)
      setSelectedReport(detail)
    } catch {
      setErrorMessage(t('reports.loadError'))
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handlePrintReport(reportId: number) {
    setLoadingDetail(true)
    setErrorMessage(undefined)
    try {
      const detail = await fetchReportById(reportId)
      setSelectedReport(detail)
      setLoadingDetail(false)
      await nextPaint()
      printCaseReport(detail, t)
    } catch {
      setErrorMessage(t('reports.loadError'))
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleDeleteReport() {
    if (!selectedReport) return
    if (!window.confirm(t('reports.detail.confirmDelete', { id: `RPT-${String(selectedReport.id).padStart(4, '0')}` }))) return
    setDeletingReport(true)
    setErrorMessage(undefined)
    try {
      await deleteReport(selectedReport.id)
      setReports((current) => current.filter((report) => report.id !== selectedReport.id))
      setSelectedReport(null)
    } catch {
      setErrorMessage(t('reports.deleteError'))
    } finally {
      setDeletingReport(false)
    }
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
      </div>
      {errorMessage ? <div className="case-reports-error">{errorMessage}</div> : null}

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
              <th>{t('cases.reports.col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {reports
              .slice()
              .sort((a, b) => (b.dateOfVisit ?? '').localeCompare(a.dateOfVisit ?? ''))
              .map((report) => (
                <tr
                  key={report.id}
                  className={'case-reports-row' + (selectedReport?.id === report.id ? ' active' : '')}
                  onClick={() => void openReport(report.id)}
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
                  <td>
                    <button
                      className="case-report-print-tag"
                      type="button"
                      disabled={loadingDetail}
                      onClick={(event) => {
                        event.stopPropagation()
                        void handlePrintReport(report.id)
                      }}
                    >
                      {t('cases.reports.print')}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {loadingDetail ? (
        <div className="case-reports-state">{t('reports.loading')}</div>
      ) : selectedReport ? (
        <CaseReportDetail
          report={selectedReport}
          deleting={deletingReport}
          readOnly={readOnly}
          onClose={() => setSelectedReport(null)}
          onDelete={() => void handleDeleteReport()}
        />
      ) : null}
    </div>
  )
}

function displayText(value: string | null | undefined): string {
  return value?.trim() || '—'
}

function CaseReportDetail({
  report,
  deleting,
  readOnly,
  onClose,
  onDelete,
}: {
  report: ReportDetail
  deleting: boolean
  readOnly: boolean
  onClose: () => void
  onDelete: () => void
}) {
  const { t, i18n } = useTranslation()
  const clientName = i18n.language.startsWith('zh')
    ? report.clientNameChn || report.clientNameEn
    : report.clientNameEn || report.clientNameChn
  const reportMeta = [report.caseCode, clientName, formatDate(report.dateOfVisit), displayText(report.createdByName ?? report.staffName)]
    .filter((value) => value && value !== '—')
    .join(' · ')

  return (
    <section className="case-report-detail">
      <header className="case-report-detail-header">
        <div>
          <h4>{report.eventTitle || t('reports.detail.title')}</h4>
          <span>{reportMeta}</span>
        </div>
        <div className="case-report-detail-actions">
          <button className="btn-secondary btn-compact case-report-print-action" type="button" onClick={() => printCaseReport(report, t)}>
            {t('cases.reports.print')}
          </button>
          <button className="btn-secondary btn-compact" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          {!readOnly ? (
            <button className="btn-danger btn-compact" type="button" disabled={deleting} onClick={onDelete}>
              {deleting ? t('reports.detail.deleting') : t('reports.detail.delete')}
            </button>
          ) : null}
        </div>
      </header>

      <div className="case-report-detail-grid">
        <ReportField label={t('reports.form.dateOfVisit')} value={formatDate(report.dateOfVisit)} />
        <ReportField label={t('reports.form.timeOfVisit')} value={displayText(report.timeOfVisit)} />
        <ReportField label={t('reports.form.duration')} value={displayText(report.durationOfVisit)} />
        <ReportField label={t('reports.form.location')} value={displayText(report.location)} />
        <ReportField label={t('reports.form.visitType')} value={displayText(report.typeOfVisit)} />
        <ReportField label={t('reports.form.programme')} value={displayText(report.programmeName)} />
        <ReportField label={t('reports.form.purpose')} value={displayText(report.purposeOfVisit)} wide />
        <ReportField label={t('reports.form.whatWasDone')} value={displayText(report.whatWasDone)} wide />
        <ReportField label={t('reports.form.envObs')} value={displayText(report.environmentObservations)} />
        <ReportField label={t('reports.form.sanghaObs')} value={displayText(report.sanghaObservations)} />
        <ReportField label={t('reports.form.otherObs')} value={displayText(report.otherObservations)} wide />
        <ReportField label={t('reports.form.personalReflections')} value={displayText(report.personalReflections)} wide />
        <ReportField label={t('reports.form.recommendations')} value={displayText(report.recommendations)} />
        <ReportField label={t('reports.form.highlights')} value={displayText(report.mattersToHighlight)} />
      </div>
    </section>
  )
}

function printCaseReport(report: ReportDetail, t: (key: string) => string) {
  const previousTitle = document.title
  document.title = `${t('reports.detail.title')} RPT-${String(report.id).padStart(4, '0')}`
  document.body.classList.add('printing-case-report')
  try {
    window.print()
  } finally {
    document.body.classList.remove('printing-case-report')
    document.title = previousTitle
  }
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function ReportField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={'case-report-detail-field' + (wide ? ' wide' : '')}>
      <span>{label}</span>
      <p>{value}</p>
    </div>
  )
}
