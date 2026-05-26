import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { BackButton, ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
import { deleteReport, fetchReportById } from '../api/report.api'
import type { ReportDetail } from '../types'
import './reports.css'

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

function displayText(value: string | null | undefined, fallback = '-'): string {
  return value?.trim() || fallback
}

function displayClientName(report: ReportDetail, isZh: boolean): string {
  const zh = report.clientNameChn?.trim()
  const en = report.clientNameEn?.trim()
  if (isZh) return zh || en || ''
  return en || zh || ''
}

interface DetailItemProps {
  label: string
  value: string
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="report-detail-item">
      <div className="report-detail-label">
        <span>{label}</span>
      </div>
      <div className="report-detail-value">{value}</div>
    </div>
  )
}

interface TextBlockProps {
  title: string
  value: string | null | undefined
}

function TextBlock({ title, value }: TextBlockProps) {
  const { t } = useTranslation()
  return (
    <section className="report-text-block">
      <h3>{title}</h3>
      <p>{displayText(value, t('reports.detail.noContent'))}</p>
    </section>
  )
}

export function ReportDetailPage() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<ReportDetail>()
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    let active = true

    async function loadReport() {
      if (!id) {
        setErrorMessage(t('reports.missingId'))
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const data = await fetchReportById(id)
        if (active) {
          setReport(data)
          setErrorMessage(undefined)
        }
      } catch {
        if (active) {
          setErrorMessage(t('reports.loadError'))
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadReport()

    return () => {
      active = false
    }
  }, [id, t])

  const reportTitle = useMemo(() => {
    if (!report) return t('common.loading')
    return `RPT-${String(report.id).padStart(4, '0')}`
  }, [report, t])

  async function handleDelete() {
    if (!report) return

    const confirmed = window.confirm(
      t('reports.detail.confirmDelete', { id: `RPT-${String(report.id).padStart(4, '0')}` }),
    )
    if (!confirmed) return

    setIsDeleting(true)
    setErrorMessage(undefined)

    try {
      await deleteReport(report.id)
      navigate('/reports')
    } catch {
      setErrorMessage(t('reports.deleteError'))
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="report-page">
        <PageHeader title={t('common.loading')} />
      </div>
    )
  }

  if (errorMessage || !report) {
    return (
      <div className="report-page">
        <BackButton onClick={() => navigate('/reports')} />
        <PageHeader title={t('reports.notFound')} />
        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      </div>
    )
  }

  const clientName = displayClientName(report, isZh)
  const staffName = displayText(report.createdByName ?? report.staffName, 'Unknown')

  return (
    <div className="report-page">
      <BackButton onClick={() => navigate('/reports')} />

      <PageHeader
        title={reportTitle}
        subtitle={`${t('reports.detail.title')} · ${clientName}`}
        description={`${t('reports.detail.submittedBy', { name: staffName })} · ${formatDate(report.createdAt ?? report.reportTimestamp)}`}
      />

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <SectionCard className="report-action-card" ariaLabel="Report actions" bodyPadding>
        <div className="report-action-header">
          <div>
            <h2>{t('reports.detail.title')}</h2>
            <p>
              {t('reports.detail.submitted')} · {staffName} · {formatDate(report.dateOfVisit)}
            </p>
          </div>
          <div className="report-status-stack">
            <span className="report-status-submitted">{t('reports.detail.submitted')}</span>
            <span className="report-status-urgent">⚠ {t('reports.detail.urgent')}</span>
          </div>
        </div>

        <div className="report-detail-actions">
          <button className="report-action-danger" type="button" onClick={() => window.alert(t('common.comingSoon'))}>
            {t('reports.detail.resolveFlag')}
          </button>
          <button className="report-action-success" type="button" onClick={() => window.alert(t('common.comingSoon'))}>
            {t('reports.detail.approve')}
          </button>
          <button className="report-action-secondary" type="button" onClick={() => window.alert(t('common.comingSoon'))}>
            {t('reports.detail.archive')}
          </button>
          <button className="report-action-delete" type="button" disabled={isDeleting} onClick={() => void handleDelete()}>
            {isDeleting ? t('reports.detail.deleting') : t('reports.detail.delete')}
          </button>
        </div>

        <div className="report-urgent-mock-banner">
          <span>{t('reports.detail.urgentBanner', { name: staffName })}</span>
          <button type="button" onClick={() => window.alert(t('common.comingSoon'))}>
            ✓ {t('reports.detail.markResolved')}
          </button>
        </div>
      </SectionCard>

      <SectionCard className="report-detail-card" ariaLabel="Report summary" bodyPadding>
        <div className="report-detail-grid">
          <DetailItem label={t('reports.detail.field.client')} value={clientName} />
          <DetailItem label={t('reports.detail.field.createdBy')} value={staffName} />
          <DetailItem label={t('reports.detail.field.visitDate')} value={formatDate(report.dateOfVisit)} />
          <DetailItem label={t('reports.detail.field.visitTime')} value={displayText(report.timeOfVisit)} />
          <DetailItem label={t('reports.detail.field.duration')} value={displayText(report.durationOfVisit)} />
          <DetailItem label={t('reports.detail.field.location')} value={displayText(report.location)} />
          <DetailItem label={t('reports.detail.field.programme')} value={displayText(report.programmeName)} />
          <DetailItem label={t('reports.detail.field.visitType')} value={displayText(report.typeOfVisit)} />
        </div>
      </SectionCard>

      <div className="report-detail-sections">
        <TextBlock title={t('reports.detail.section.purpose')} value={report.purposeOfVisit} />
        <TextBlock title={t('reports.detail.section.whatWasDone')} value={report.whatWasDone} />
        <TextBlock title={t('reports.detail.section.environment')} value={report.environmentObservations} />
        <TextBlock title={t('reports.detail.section.sangha')} value={report.sanghaObservations} />
        <TextBlock title={t('reports.detail.section.other')} value={report.otherObservations} />
        <TextBlock title={t('reports.detail.section.reflections')} value={report.personalReflections} />
        <TextBlock title={t('reports.detail.section.recommendations')} value={report.recommendations} />
        <TextBlock title={t('reports.detail.section.highlights')} value={report.mattersToHighlight} />
      </div>
    </div>
  )
}
