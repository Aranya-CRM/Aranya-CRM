import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BackButton, ErrorBanner, PageHeader } from '../../../shared/ui'
import { useAccess } from '../../../shared/auth/useAccess'
import { formatServiceTitle } from '../../../shared/format/serviceTitle'
import { approveReport, deleteReport, fetchReportById, submitReport } from '../api/report.api'
import type { ReportDetail } from '../types'
import './reports.css'

function displayText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return value.slice(0, 10)
}

function withReturnTo(path: string, returnTo: string, clientName?: string): string {
  const params = new URLSearchParams({ returnTo })
  if (clientName) params.set('clientName', clientName)
  return `${path}?${params.toString()}`
}

export function ReportDetailPage() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const navigate = useNavigate()
  const { getCap } = useAccess()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/reports'
  const [report, setReport] = useState<ReportDetail>()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  const canApprove = getCap('reports:approve_archive') !== 'NO'

  useEffect(() => {
    if (!id) {
      setIsLoading(false)
      setErrorMessage(t('reports.missingId'))
      return
    }

    let active = true

    async function loadReport() {
      setIsLoading(true)
      setErrorMessage(undefined)
      try {
        const data = await fetchReportById(id!)
        if (active) setReport(data)
      } catch {
        if (active) setErrorMessage(t('reports.loadError'))
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadReport()
    return () => {
      active = false
    }
  }, [id, t])

  async function handleSubmitDraft() {
    if (!report) return
    setIsSubmitting(true)
    setErrorMessage(undefined)
    try {
      const submitted = await submitReport(report.id)
      setReport(submitted)
      navigate(returnTo.startsWith('/tasks/') ? `${returnTo}?reportId=${submitted.id}` : withReturnTo(`/reports/${submitted.id}`, returnTo), { replace: true })
    } catch {
      setErrorMessage(t('reports.form.submitError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleApprove() {
    if (!report) return
    setIsApproving(true)
    setErrorMessage(undefined)
    try {
      const approved = await approveReport(report.id)
      setReport(approved)
    } catch {
      setErrorMessage(t('reports.detail.approveError'))
    } finally {
      setIsApproving(false)
    }
  }

  async function handleDeleteDraft() {
    if (!report || !window.confirm(t('reports.detail.confirmDelete', { id: formatServiceTitle(report) }))) return
    setIsDeleting(true)
    setErrorMessage(undefined)
    try {
      await deleteReport(report.id)
      navigate(returnTo, { replace: true })
    } catch {
      setErrorMessage(t('reports.deleteError'))
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="report-page">
        <BackButton onClick={() => navigate(returnTo)} />
        <PageHeader title={t('reports.loading')} />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="report-page">
        <BackButton onClick={() => navigate(returnTo)} />
        <PageHeader title={t('reports.notFound')} />
        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      </div>
    )
  }

  const status = report.status ?? 'SUBMITTED'
  const clientName = isZh ? report.clientNameChn || report.clientNameEn : report.clientNameEn || report.clientNameChn
  const editPath = withReturnTo(`/reports/${report.id}/edit`, returnTo, clientName || undefined)

  return (
    <div className="report-page">
      <BackButton onClick={() => navigate(returnTo)} />
      <PageHeader
        title={formatServiceTitle(report)}
        description={t(`reports.status.${status}`)}
      />

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <article className="report-read-flow" aria-label="Report detail">
        <ReadOnlyField label={t('reports.form.monastic')} value={displayText(clientName)} />
        <ReadOnlyField label={t('reports.form.staffName')} value={displayText(report.createdByName ?? report.staffName)} />
        <ReadOnlyField label={t('reports.form.dateOfVisit')} value={formatDate(report.dateOfVisit)} />
        <ReadOnlyField label={t('reports.form.timeOfVisit')} value={displayText(report.timeOfVisit)} />
        <ReadOnlyField label={t('reports.form.duration')} value={displayText(report.durationOfVisit)} />
        <ReadOnlyField label={t('reports.form.location')} value={displayText(report.location)} />
        <ReadOnlyField label={t('reports.form.visitType')} value={displayText(report.typeOfVisit)} />
        <ReadOnlyField label={t('reports.form.programme')} value={displayText(report.programmeName)} />
        <ReadOnlyField label={t('reports.form.purpose')} value={displayText(report.purposeOfVisit)} />
        <ReadOnlyField label={t('reports.form.whatWasDone')} value={displayText(report.whatWasDone)} />
        <ReadOnlyField label={t('reports.form.envObs')} value={displayText(report.environmentObservations)} />
        <ReadOnlyField label={t('reports.form.sanghaObs')} value={displayText(report.sanghaObservations)} />
        <ReadOnlyField label={t('reports.form.otherObs')} value={displayText(report.otherObservations)} />
        <ReadOnlyField label={t('reports.form.personalReflections')} value={displayText(report.personalReflections)} />
        <ReadOnlyField label={t('reports.form.recommendations')} value={displayText(report.recommendations)} />
        <ReadOnlyField label={t('reports.form.highlights')} value={displayText(report.mattersToHighlight)} />
      </article>

      <div className="report-form-footer">
        <button className="btn-secondary" type="button" onClick={() => navigate(returnTo)}>
          {t('common.cancel')}
        </button>
        {status === 'DRAFT' ? (
          <div className="report-form-actions">
            <button className="report-action-delete" type="button" onClick={() => void handleDeleteDraft()} disabled={isSubmitting || isDeleting}>
              {isDeleting ? t('reports.detail.deleting') : t('reports.detail.deleteDraft')}
            </button>
            <button className="btn-secondary" type="button" onClick={() => navigate(editPath)} disabled={isSubmitting || isDeleting}>
              {t('reports.detail.edit')}
            </button>
            <button className="btn-primary" type="button" onClick={() => void handleSubmitDraft()} disabled={isSubmitting || isDeleting}>
              {isSubmitting ? t('reports.form.submitting') : t('reports.form.submitFinal')}
            </button>
          </div>
        ) : status === 'SUBMITTED' && canApprove ? (
          <div className="report-form-actions">
            <button className="btn-primary" type="button" onClick={() => void handleApprove()} disabled={isApproving}>
              {isApproving ? t('reports.detail.approving') : t('reports.detail.approve')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string, value: string }) {
  return (
    <section className="report-read-field">
      <h2>{label}</h2>
      <p>{value}</p>
    </section>
  )
}
