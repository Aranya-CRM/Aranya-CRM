import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BackButton, ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
import { fetchEvents } from '../../tasks/api/task.api'
import type { ServiceEvent } from '../../cases/types'
import { createReport, fetchReportById, submitReport, updateReport } from '../api/report.api'
import type { CreateReportPayload, ReportDetail, ReportStatus } from '../types'
import './reports.css'

type ReportFormState = {
  dateOfVisit: string
  timeOfVisit: string
  purposeOfVisit: string
  whatWasDone: string
  environmentObservations: string
  sanghaObservations: string
  otherObservations: string
  personalReflections: string
  recommendations: string
  mattersToHighlight: string
}

const initialForm: ReportFormState = {
  dateOfVisit: '',
  timeOfVisit: '',
  purposeOfVisit: '',
  whatWasDone: '',
  environmentObservations: '',
  sanghaObservations: '',
  otherObservations: '',
  personalReflections: '',
  recommendations: '',
  mattersToHighlight: '',
}

function reportToForm(report: ReportDetail): ReportFormState {
  return {
    dateOfVisit: report.dateOfVisit ?? '',
    timeOfVisit: report.timeOfVisit ?? '',
    purposeOfVisit: report.purposeOfVisit ?? '',
    whatWasDone: report.whatWasDone ?? '',
    environmentObservations: report.environmentObservations ?? '',
    sanghaObservations: report.sanghaObservations ?? '',
    otherObservations: report.otherObservations ?? '',
    personalReflections: report.personalReflections ?? '',
    recommendations: report.recommendations ?? '',
    mattersToHighlight: report.mattersToHighlight ?? '',
  }
}

function formatDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ''
}

function formatTime(value: string | null | undefined): string {
  return value ? value.slice(11, 16) : ''
}

function formatEventTime(event: ServiceEvent | undefined): string {
  if (!event?.scheduledStart) return ''
  const start = formatTime(event.scheduledStart)
  const end = formatTime(event.scheduledEnd)
  return end ? `${start} - ${end}` : start
}

function eventContent(event: ServiceEvent): string {
  const seen = new Set<string>()
  return [
    event.workDescription,
    event.agenda,
    event.schedule,
    event.manpower,
    event.instructions,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => {
      if (!part || seen.has(part)) return false
      seen.add(part)
      return true
    })
    .join('\n\n')
}

function compactPayload(form: ReportFormState, event: ServiceEvent, status: ReportStatus): CreateReportPayload {
  return {
    clientId: Number(event.clientId),
    caseId: Number(event.caseId),
    appointmentId: Number(event.id),
    dateOfVisit: form.dateOfVisit || formatDate(event.scheduledStart),
    timeOfVisit: form.timeOfVisit.trim() || formatEventTime(event) || undefined,
    location: event.location?.trim() || undefined,
    programmeName: event.serviceName?.trim() || undefined,
    typeOfVisit: event.serviceKey?.trim() || event.serviceName?.trim() || undefined,
    purposeOfVisit: form.purposeOfVisit.trim() || eventContent(event) || undefined,
    whatWasDone: form.whatWasDone.trim() || undefined,
    environmentObservations: form.environmentObservations.trim() || undefined,
    sanghaObservations: form.sanghaObservations.trim() || undefined,
    otherObservations: form.otherObservations.trim() || undefined,
    personalReflections: form.personalReflections.trim() || undefined,
    recommendations: form.recommendations.trim() || undefined,
    mattersToHighlight: form.mattersToHighlight.trim() || undefined,
    status,
  }
}

export function ReportFormPage() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/reports'
  const appointmentIdParam = searchParams.get('appointmentId')
  const isEditMode = Boolean(id)
  const [eventContext, setEventContext] = useState<ServiceEvent>()
  const [form, setForm] = useState<ReportFormState>(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reportStatus, setReportStatus] = useState<ReportStatus>('DRAFT')
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    let active = true

    async function loadContext() {
      setIsLoading(true)
      setErrorMessage(undefined)
      try {
        const report = id ? await fetchReportById(id) : undefined
        const appointmentId = report?.appointmentId ?? (appointmentIdParam ? Number(appointmentIdParam) : undefined)
        if (!appointmentId) {
          throw new Error(t('reports.form.eventRequired'))
        }
        const events = await fetchEvents('mine')
        const matchedEvent = events.find((item) => Number(item.id) === Number(appointmentId))
        if (!matchedEvent) {
          throw new Error(t('reports.form.eventNotAssigned'))
        }
        if (!active) return
        setEventContext(matchedEvent)
        if (report) {
          setForm(reportToForm(report))
          setReportStatus(report.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT')
        } else {
          setForm((prev) => ({
            ...prev,
            dateOfVisit: formatDate(matchedEvent.scheduledStart),
            timeOfVisit: formatEventTime(matchedEvent),
            purposeOfVisit: eventContent(matchedEvent),
          }))
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : t('reports.loadError'))
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadContext()
    return () => {
      active = false
    }
  }, [appointmentIdParam, id, t])

  const clientName = useMemo(() => {
    if (!eventContext) return ''
    const primary = isZh ? eventContext.clientNameChn : eventContext.clientNameEn
    const secondary = isZh ? eventContext.clientNameEn : eventContext.clientNameChn
    return primary || secondary || eventContext.clientAbbr || ''
  }, [eventContext, isZh])

  function updateField<K extends keyof ReportFormState>(key: K, value: ReportFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!eventContext) {
      setErrorMessage(t('reports.form.eventRequired'))
      return
    }

    const submitter = event.nativeEvent instanceof SubmitEvent
      ? event.nativeEvent.submitter as HTMLButtonElement | null
      : null
    const status: ReportStatus = submitter?.value === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT'
    if (isEditMode && reportStatus === 'SUBMITTED') {
      navigate(returnTo)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(undefined)

    try {
      const payload = compactPayload(form, eventContext, status)
      const saved = isEditMode && id
        ? status === 'SUBMITTED'
          ? await submitReport((await updateReport(id, { ...payload, status: 'DRAFT' })).id)
          : await updateReport(id, payload)
        : await createReport(payload)
      navigate(`${returnTo}?reportId=${saved.id}`, {
        state: { report: saved },
      })
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : ''
      setErrorMessage(`${t('reports.form.submitError')}${detail}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="report-page">
      <BackButton onClick={() => navigate(returnTo)} />

      <PageHeader
        title={isEditMode ? t('reports.form.editTitle') : t('reports.form.title')}
        description={t('reports.form.description')}
      />

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      {isLoading ? (
        <div className="report-form-loading">{t('reports.loading')}</div>
      ) : !eventContext ? (
        <div className="report-form-loading">{t('reports.form.eventRequired')}</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <SectionCard
            className="report-form-card"
            title={t('reports.form.eventContext')}
            ariaLabel="Event context"
            bodyPadding
          >
            <div className="report-fixed-grid">
              <ReadOnlyField label={t('tasks.request.subject')} value={eventContext.title} />
              <ReadOnlyField label={t('reports.form.member')} value={clientName} />
              <ReadOnlyField label={t('reports.form.case')} value={eventContext.caseCode ?? ''} />
              <label className="report-form-field">
                <span>{t('reports.form.dateOfVisit')}</span>
                <input
                  className="report-form-control"
                  type="date"
                  value={form.dateOfVisit}
                  onChange={(event) => updateField('dateOfVisit', event.target.value)}
                />
              </label>
              <label className="report-form-field">
                <span>{t('reports.form.timeOfVisit')}</span>
                <input
                  className="report-form-control"
                  type="text"
                  value={form.timeOfVisit}
                  onChange={(event) => updateField('timeOfVisit', event.target.value)}
                />
              </label>
              <ReadOnlyField label={t('reports.form.location')} value={eventContext.location ?? ''} />
              <ReadOnlyField label={t('tasks.request.address')} value={eventContext.address ?? ''} wide />
              <ReadOnlyField label={t('tasks.request.content')} value={eventContent(eventContext)} wide />
            </div>
          </SectionCard>

          <SectionCard
            className="report-form-card"
            title={t('reports.form.sectionObs')}
            ariaLabel="Report observations"
            bodyPadding
          >
            <div className="report-form-grid">
              <label className="report-form-field full-width">
                <span>{t('reports.form.purpose')}</span>
                <textarea
                  className="report-form-control report-form-textarea"
                  value={form.purposeOfVisit}
                  onChange={(event) => updateField('purposeOfVisit', event.target.value)}
                />
              </label>

              <label className="report-form-field full-width">
                <span>{t('reports.form.whatWasDone')}</span>
                <textarea
                  className="report-form-control report-form-textarea large"
                  value={form.whatWasDone}
                  onChange={(event) => updateField('whatWasDone', event.target.value)}
                />
              </label>

              <label className="report-form-field">
                <span>{t('reports.form.envObs')}</span>
                <textarea
                  className="report-form-control report-form-textarea"
                  value={form.environmentObservations}
                  onChange={(event) => updateField('environmentObservations', event.target.value)}
                />
              </label>

              <label className="report-form-field">
                <span>{t('reports.form.sanghaObs')}</span>
                <textarea
                  className="report-form-control report-form-textarea"
                  value={form.sanghaObservations}
                  onChange={(event) => updateField('sanghaObservations', event.target.value)}
                />
              </label>

              <label className="report-form-field full-width">
                <span>{t('reports.form.otherObs')}</span>
                <textarea
                  className="report-form-control report-form-textarea"
                  value={form.otherObservations}
                  onChange={(event) => updateField('otherObservations', event.target.value)}
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            className="report-form-card"
            title={t('reports.form.sectionReflections')}
            ariaLabel="Report recommendations"
            bodyPadding
          >
            <div className="report-form-grid">
              <label className="report-form-field full-width">
                <span>{t('reports.form.personalReflections')}</span>
                <textarea
                  className="report-form-control report-form-textarea"
                  value={form.personalReflections}
                  onChange={(event) => updateField('personalReflections', event.target.value)}
                />
              </label>

              <label className="report-form-field">
                <span>{t('reports.form.recommendations')}</span>
                <textarea
                  className="report-form-control report-form-textarea"
                  value={form.recommendations}
                  onChange={(event) => updateField('recommendations', event.target.value)}
                />
              </label>

              <label className="report-form-field">
                <span>{t('reports.form.highlights')}</span>
                <textarea
                  className="report-form-control report-form-textarea"
                  value={form.mattersToHighlight}
                  onChange={(event) => updateField('mattersToHighlight', event.target.value)}
                />
              </label>
            </div>
          </SectionCard>

          <div className="report-form-footer">
            <button className="btn-secondary" type="button" disabled={isSubmitting} onClick={() => navigate(returnTo)}>
              {t('common.cancel')}
            </button>
            {reportStatus === 'SUBMITTED' ? null : (
              <div className="report-form-actions">
                <button
                  className="btn-secondary"
                  type="submit"
                  name="reportStatus"
                  value="DRAFT"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('common.saving') : t('reports.form.saveDraft')}
                </button>
                <button
                  className="btn-primary"
                  type="submit"
                  name="reportStatus"
                  value="SUBMITTED"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('reports.form.submitting') : t('reports.form.submitFinal')}
                </button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

function ReadOnlyField({ label, value, wide }: { label: string, value: string, wide?: boolean }) {
  return (
    <div className={`report-fixed-field${wide ? ' wide' : ''}`}>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}
