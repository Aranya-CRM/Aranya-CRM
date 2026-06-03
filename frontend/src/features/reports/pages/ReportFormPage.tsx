import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { fetchClients } from '../../clients/api/client.api'
import type { Client } from '../../clients/types'
import { BackButton, ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
import { createReport, fetchReportById, submitReport, updateReport } from '../api/report.api'
import type { CreateReportPayload, ReportDetail, ReportStatus } from '../types'
import './reports.css'

const VISIT_TYPES = [
  '',
  'Home Visit',
  'Temple Visit',
  'Medical',
  'Phone Call',
  'Follow-up',
]

type ReportFormState = {
  clientId: string
  dateOfVisit: string
  timeOfVisit: string
  durationOfVisit: string
  location: string
  programmeName: string
  typeOfVisit: string
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
  clientId: '',
  dateOfVisit: '',
  timeOfVisit: '',
  durationOfVisit: '',
  location: '',
  programmeName: '',
  typeOfVisit: '',
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
    clientId: report.clientId ? String(report.clientId) : '',
    dateOfVisit: report.dateOfVisit ?? '',
    timeOfVisit: report.timeOfVisit ?? '',
    durationOfVisit: report.durationOfVisit ?? '',
    location: report.location ?? '',
    programmeName: report.programmeName ?? '',
    typeOfVisit: report.typeOfVisit ?? '',
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

function clientLabel(client: Client, isZh: boolean): string {
  const primary = isZh ? client.nameChn : client.nameEn
  const secondary = isZh ? client.nameEn : client.nameChn
  return primary || secondary || client.abbr || `Client ${client.id}`
}

function compactPayload(form: ReportFormState): CreateReportPayload {
  return {
    clientId: Number(form.clientId),
    dateOfVisit: form.dateOfVisit,
    timeOfVisit: form.timeOfVisit.trim() || undefined,
    durationOfVisit: form.durationOfVisit.trim() || undefined,
    location: form.location.trim() || undefined,
    programmeName: form.programmeName.trim() || undefined,
    typeOfVisit: form.typeOfVisit.trim() || undefined,
    purposeOfVisit: form.purposeOfVisit.trim() || undefined,
    whatWasDone: form.whatWasDone.trim() || undefined,
    environmentObservations: form.environmentObservations.trim() || undefined,
    sanghaObservations: form.sanghaObservations.trim() || undefined,
    otherObservations: form.otherObservations.trim() || undefined,
    personalReflections: form.personalReflections.trim() || undefined,
    recommendations: form.recommendations.trim() || undefined,
    mattersToHighlight: form.mattersToHighlight.trim() || undefined,
  }
}

export function ReportFormPage() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/reports'
  const initialClientId = searchParams.get('clientId')
  const initialClientName = searchParams.get('clientName') || ''
  const isEditMode = Boolean(id)
  const isTaskReturn = returnTo.startsWith('/tasks/')
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState<ReportFormState>(() => ({
    ...initialForm,
    clientId: initialClientId ?? '',
  }))
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [isLoadingReport, setIsLoadingReport] = useState(Boolean(id))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reportStatus, setReportStatus] = useState<ReportStatus>('DRAFT')
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    let active = true

    async function loadClients() {
      try {
        const data = await fetchClients()
        if (active) {
          setClients(data)
          setErrorMessage(undefined)
        }
      } catch {
        if (active) {
          setErrorMessage(t('reports.form.loadError'))
        }
      } finally {
        if (active) {
          setIsLoadingClients(false)
        }
      }
    }

    void loadClients()

    return () => {
      active = false
    }
  }, [t])

  useEffect(() => {
    if (!id && initialClientId) {
      setForm((prev) => ({ ...prev, clientId: initialClientId }))
    }
  }, [id, initialClientId])

  useEffect(() => {
    if (!id) return
    let active = true

    async function loadReport() {
      setIsLoadingReport(true)
      try {
        const data = await fetchReportById(id!)
        if (active) {
          setForm(reportToForm(data))
          setReportStatus(data.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT')
          setErrorMessage(undefined)
        }
      } catch {
        if (active) {
          setErrorMessage(t('reports.loadError'))
        }
      } finally {
        if (active) {
          setIsLoadingReport(false)
        }
      }
    }

    void loadReport()

    return () => {
      active = false
    }
  }, [id, t])

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => clientLabel(a, isZh).localeCompare(clientLabel(b, isZh))),
    [clients, isZh],
  )

  function updateField<K extends keyof ReportFormState>(key: K, value: ReportFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const submitter = event.nativeEvent instanceof SubmitEvent
      ? event.nativeEvent.submitter as HTMLButtonElement | null
      : null
    const status: ReportStatus = submitter?.value === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT'
    if (isEditMode && reportStatus === 'SUBMITTED') {
      navigate(returnTo)
      return
    }

    if (!form.clientId || !form.dateOfVisit) {
      setErrorMessage(t('reports.form.required'))
      return
    }

    setIsSubmitting(true)
    setErrorMessage(undefined)

    try {
      const payload = { ...compactPayload(form), status }
      const saved = isEditMode && id
        ? status === 'SUBMITTED'
          ? await submitReport((await updateReport(id, { ...payload, status: 'DRAFT' })).id)
          : await updateReport(id, payload)
        : await createReport(payload)
      navigate(isTaskReturn ? `${returnTo}?reportId=${saved.id}` : returnTo)
    } catch {
      setErrorMessage(t('reports.form.submitError'))
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

      {isLoadingReport ? (
        <div className="report-form-loading">{t('reports.loading')}</div>
      ) : (
      <form onSubmit={handleSubmit}>
        <SectionCard
          className="report-form-card"
          title={t('reports.form.sectionBasic')}
          ariaLabel="Report basic information"
          bodyPadding
        >
          <div className="report-form-grid">
            <label className="report-form-field">
              <span>{t('reports.form.monastic')} <strong>*</strong></span>
              <select
                className="report-form-control"
                value={form.clientId}
                disabled={isLoadingClients}
                onChange={(event) => updateField('clientId', event.target.value)}
              >
                <option value="">{isLoadingClients ? t('reports.form.loadingMonastics') : t('reports.form.selectMonastic')}</option>
                {initialClientId && initialClientName && !sortedClients.some((client) => String(client.id) === initialClientId) ? (
                  <option value={initialClientId}>{initialClientName}</option>
                ) : null}
                {sortedClients.map((client) => (
                  <option key={client.id} value={client.id}>{clientLabel(client, isZh)}</option>
                ))}
              </select>
            </label>

            <label className="report-form-field">
              <span>{t('reports.form.dateOfVisit')} <strong>*</strong></span>
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
                placeholder="10:30 AM"
                value={form.timeOfVisit}
                onChange={(event) => updateField('timeOfVisit', event.target.value)}
              />
            </label>

            <label className="report-form-field">
              <span>{t('reports.form.duration')}</span>
              <input
                className="report-form-control"
                type="text"
                placeholder="45 minutes"
                value={form.durationOfVisit}
                onChange={(event) => updateField('durationOfVisit', event.target.value)}
              />
            </label>

            <label className="report-form-field">
              <span>{t('reports.form.location')}</span>
              <input
                className="report-form-control"
                type="text"
                value={form.location}
                onChange={(event) => updateField('location', event.target.value)}
              />
            </label>

            <label className="report-form-field">
              <span>{t('reports.form.visitType')}</span>
              <select
                className="report-form-control"
                value={form.typeOfVisit}
                onChange={(event) => updateField('typeOfVisit', event.target.value)}
              >
                {VISIT_TYPES.map((type) => (
                  <option key={type || 'empty'} value={type}>{type || t('reports.form.selectType')}</option>
                ))}
              </select>
            </label>

            <label className="report-form-field">
              <span>{t('reports.form.programme')}</span>
              <input
                className="report-form-control"
                type="text"
                value={form.programmeName}
                onChange={(event) => updateField('programmeName', event.target.value)}
              />
            </label>

            <label className="report-form-field">
              <span>{t('reports.form.purpose')}</span>
              <input
                className="report-form-control"
                type="text"
                value={form.purposeOfVisit}
                onChange={(event) => updateField('purposeOfVisit', event.target.value)}
              />
            </label>
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
                disabled={isSubmitting || isLoadingClients}
              >
                {isSubmitting ? t('common.saving') : t('reports.form.saveDraft')}
              </button>
              <button
                className="btn-primary"
                type="submit"
                name="reportStatus"
                value="SUBMITTED"
                disabled={isSubmitting || isLoadingClients}
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
