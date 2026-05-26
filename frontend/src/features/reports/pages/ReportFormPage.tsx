import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { fetchClients } from '../../clients/api/client.api'
import type { Client } from '../../clients/types'
import { BackButton, ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
import { createReport } from '../api/report.api'
import type { CreateReportPayload } from '../types'
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
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState<ReportFormState>(initialForm)
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => clientLabel(a, isZh).localeCompare(clientLabel(b, isZh))),
    [clients, isZh],
  )

  function updateField<K extends keyof ReportFormState>(key: K, value: ReportFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.clientId || !form.dateOfVisit) {
      setErrorMessage(t('reports.form.required'))
      return
    }

    setIsSubmitting(true)
    setErrorMessage(undefined)

    try {
      const created = await createReport(compactPayload(form))
      navigate(`/reports/${created.id}`)
    } catch {
      setErrorMessage(t('reports.form.submitError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="report-page">
      <BackButton onClick={() => navigate('/reports')} />

      <PageHeader
        title={t('reports.form.title')}
        description={t('reports.form.description')}
      />

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

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
          <button className="btn-secondary" type="button" disabled={isSubmitting} onClick={() => navigate('/reports')}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" type="submit" disabled={isSubmitting || isLoadingClients}>
            {isSubmitting ? t('reports.form.submitting') : t('reports.form.submit')}
          </button>
        </div>
      </form>
    </div>
  )
}
