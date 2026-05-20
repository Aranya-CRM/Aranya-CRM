import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
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

function clientLabel(client: Client): string {
  if (client.nameChn && client.nameEn) return `${client.nameChn} / ${client.nameEn}`
  return client.nameChn || client.nameEn || client.abbr || `Client ${client.id}`
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
          setErrorMessage('僧人列表加载失败，请稍后重试。 / Failed to load monastics.')
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
  }, [])

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => clientLabel(a).localeCompare(clientLabel(b))),
    [clients],
  )

  function updateField<K extends keyof ReportFormState>(key: K, value: ReportFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.clientId || !form.dateOfVisit) {
      setErrorMessage('请选择僧人并填写探访日期。 / Monastic and visit date are required.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(undefined)

    try {
      const created = await createReport(compactPayload(form))
      navigate(`/reports/${created.id}`)
    } catch {
      setErrorMessage('探访报告提交失败，请稍后重试。 / Failed to submit report.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="report-page">
      <BackButton onClick={() => navigate('/reports')}>← 返回探访报告 / Back to Reports</BackButton>

      <PageHeader
        titleZh="提交探访报告"
        titleEn="Submit Observation Report"
        descriptionZh="报告者将自动使用当前登录账户。"
        descriptionEn="Reporter is auto-filled from the signed-in user."
      />

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <form onSubmit={handleSubmit}>
        <SectionCard
          className="report-form-card"
          titleZh="基本信息 / Basic Info"
          ariaLabel="Report basic information"
          bodyPadding
        >
          <div className="report-form-grid">
            <label className="report-form-field">
              <span>僧人 / Monastic <strong>*</strong></span>
              <select
                className="report-form-control"
                value={form.clientId}
                disabled={isLoadingClients}
                onChange={(event) => updateField('clientId', event.target.value)}
              >
                <option value="">{isLoadingClients ? '加载中 / Loading...' : '-- 选择僧人 / Select Monastic --'}</option>
                {sortedClients.map((client) => (
                  <option key={client.id} value={client.id}>{clientLabel(client)}</option>
                ))}
              </select>
            </label>

            <label className="report-form-field">
              <span>探访日期 / Date of Visit <strong>*</strong></span>
              <input
                className="report-form-control"
                type="date"
                value={form.dateOfVisit}
                onChange={(event) => updateField('dateOfVisit', event.target.value)}
              />
            </label>

            <label className="report-form-field">
              <span>探访时间 / Time of Visit</span>
              <input
                className="report-form-control"
                type="text"
                placeholder="10:30 AM"
                value={form.timeOfVisit}
                onChange={(event) => updateField('timeOfVisit', event.target.value)}
              />
            </label>

            <label className="report-form-field">
              <span>探访时长 / Duration of Visit</span>
              <input
                className="report-form-control"
                type="text"
                placeholder="45 minutes"
                value={form.durationOfVisit}
                onChange={(event) => updateField('durationOfVisit', event.target.value)}
              />
            </label>

            <label className="report-form-field">
              <span>地点 / Location</span>
              <input
                className="report-form-control"
                type="text"
                value={form.location}
                onChange={(event) => updateField('location', event.target.value)}
              />
            </label>

            <label className="report-form-field">
              <span>探访类型 / Type of Visit</span>
              <select
                className="report-form-control"
                value={form.typeOfVisit}
                onChange={(event) => updateField('typeOfVisit', event.target.value)}
              >
                {VISIT_TYPES.map((type) => (
                  <option key={type || 'empty'} value={type}>{type || '-- 选择 / Select --'}</option>
                ))}
              </select>
            </label>

            <label className="report-form-field">
              <span>活动名称 / Programme Name</span>
              <input
                className="report-form-control"
                type="text"
                value={form.programmeName}
                onChange={(event) => updateField('programmeName', event.target.value)}
              />
            </label>

            <label className="report-form-field">
              <span>探访目的 / Purpose of Visit</span>
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
          titleZh="观察记录 / Observations"
          ariaLabel="Report observations"
          bodyPadding
        >
          <div className="report-form-grid">
            <label className="report-form-field full-width">
              <span>做了什么？ / What was done?</span>
              <textarea
                className="report-form-control report-form-textarea large"
                value={form.whatWasDone}
                onChange={(event) => updateField('whatWasDone', event.target.value)}
              />
            </label>

            <label className="report-form-field">
              <span>环境观察 / Environment Observations</span>
              <textarea
                className="report-form-control report-form-textarea"
                value={form.environmentObservations}
                onChange={(event) => updateField('environmentObservations', event.target.value)}
              />
            </label>

            <label className="report-form-field">
              <span>僧人观察 / Sangha Observations</span>
              <textarea
                className="report-form-control report-form-textarea"
                value={form.sanghaObservations}
                onChange={(event) => updateField('sanghaObservations', event.target.value)}
              />
            </label>

            <label className="report-form-field full-width">
              <span>其他观察 / Other Observations</span>
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
          titleZh="反思与建议 / Reflections & Recommendations"
          ariaLabel="Report recommendations"
          bodyPadding
        >
          <div className="report-form-grid">
            <label className="report-form-field full-width">
              <span>个人反思 / Personal Reflections</span>
              <textarea
                className="report-form-control report-form-textarea"
                value={form.personalReflections}
                onChange={(event) => updateField('personalReflections', event.target.value)}
              />
            </label>

            <label className="report-form-field">
              <span>下次探访建议 / Recommendations for Next Visit</span>
              <textarea
                className="report-form-control report-form-textarea"
                value={form.recommendations}
                onChange={(event) => updateField('recommendations', event.target.value)}
              />
            </label>

            <label className="report-form-field">
              <span>需向团队负责人汇报的事项 / Matters to Highlight</span>
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
            取消 · Cancel
          </button>
          <button className="btn-primary" type="submit" disabled={isSubmitting || isLoadingClients}>
            {isSubmitting ? '提交中...' : '提交报告 · Submit Report →'}
          </button>
        </div>
      </form>
    </div>
  )
}
