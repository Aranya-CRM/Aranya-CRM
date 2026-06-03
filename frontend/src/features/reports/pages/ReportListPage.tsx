import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAccess } from '../../../shared/auth/useAccess'
import { ErrorBanner } from '../../../shared/ui'
import { deleteReport, fetchReportById, fetchReports, submitReport, updateReport } from '../api/report.api'
import type { CreateReportPayload, ReportDetail, ReportStatus, ReportSummary } from '../types'
import './reports.css'

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

const CATEGORY_FILTERS = [
  { id: 'all', labelKey: 'reports.category.all' },
  { id: 'Befriending', labelKey: 'reports.category.befriending' },
  { id: 'Temple Improvement', labelKey: 'reports.category.temple' },
  { id: 'Food Support', labelKey: 'reports.category.food' },
  { id: 'Care Planning', labelKey: 'reports.category.planning' },
  { id: 'Case Management', labelKey: 'reports.category.case' },
]

const STATUS_FILTERS: Array<{ id: 'all' | ReportStatus, labelKey: string }> = [
  { id: 'all', labelKey: 'reports.statusFilter.all' },
  { id: 'DRAFT', labelKey: 'reports.status.DRAFT' },
  { id: 'SUBMITTED', labelKey: 'reports.status.SUBMITTED' },
]

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

function displayName(report: ReportSummary | ReportDetail, isZh: boolean): string {
  const zh = report.clientNameChn?.trim()
  const en = report.clientNameEn?.trim()
  if (isZh) return zh || en || ''
  return en || zh || ''
}

function displayText(value: string | null | undefined, fallback = '-'): string {
  return value?.trim() || fallback
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

function reportStatus(report: ReportSummary | ReportDetail | undefined): 'DRAFT' | 'SUBMITTED' {
  if (report?.status === 'DRAFT') return 'DRAFT'
  return 'SUBMITTED'
}

function isCurrentReportStatus(report: ReportSummary): boolean {
  return report.status === 'DRAFT' || report.status === 'SUBMITTED' || !report.status
}

export function ReportListPage() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const navigate = useNavigate()
  const { getCap } = useAccess()
  const mineOnly = getCap('reports:view') === 'OWN'
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedParam = searchParams.get('selected')
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportDetail>()
  const [activeCategory, setActiveCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all')
  const [search, setSearch] = useState('')
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [form, setForm] = useState<ReportFormState>()
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    let active = true

    async function loadReports() {
      setIsLoadingList(true)
      try {
        const data = await fetchReports({ mine: mineOnly })
        if (!active) return
        setReports(data)
        setErrorMessage(undefined)

        const first = selectedParam
          ? data.find((report) => String(report.id) === selectedParam) ?? data[0]
          : data[0]
        if (first) {
          setIsLoadingDetail(true)
          try {
            const detail = await fetchReportById(first.id)
            if (!active) return
            setSelectedReport(detail)
            setForm(reportToForm(detail))
          } finally {
            if (active) {
              setIsLoadingDetail(false)
            }
          }
        } else {
          setSelectedReport(undefined)
        }
      } catch {
        if (active) {
          setErrorMessage(t('reports.list.loadError'))
        }
      } finally {
        if (active) {
          setIsLoadingList(false)
        }
      }
    }

    void loadReports()

    return () => {
      active = false
    }
  }, [selectedParam, t])

  const filteredReports = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return reports.filter((report) => {
      if (!isCurrentReportStatus(report)) return false
      const matchesCategory = activeCategory === 'all' || report.typeOfVisit === activeCategory
      const matchesStatus = statusFilter === 'all' || reportStatus(report) === statusFilter
      const searchText = [
        report.clientNameChn,
        report.clientNameEn,
        report.typeOfVisit,
        report.location,
        report.programmeName,
        report.dateOfVisit,
        report.createdByName,
      ].filter(Boolean).join(' ').toLowerCase()
      return matchesCategory && matchesStatus && (!keyword || searchText.includes(keyword))
    })
  }, [reports, activeCategory, statusFilter, search])

  async function loadReportDetail(id: number | string, active = true) {
    setIsLoadingDetail(true)
    setIsEditing(false)
    try {
      const detail = await fetchReportById(id)
      if (!active) return
      setSelectedReport(detail)
      setForm(reportToForm(detail))
      setSearchParams({ selected: String(id) }, { replace: true })
      setErrorMessage(undefined)
    } catch {
      if (active) {
        setErrorMessage(t('reports.loadError'))
      }
    } finally {
      if (active) {
        setIsLoadingDetail(false)
      }
    }
  }

  function updateField<K extends keyof ReportFormState>(key: K, value: ReportFormState[K]) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  async function handleSave() {
    if (!selectedReport || !form) return
    if (!form.clientId || !form.dateOfVisit) {
      setErrorMessage(t('reports.form.required'))
      return
    }

    setIsSaving(true)
    setErrorMessage(undefined)
    try {
      const updated = await updateReport(selectedReport.id, { ...compactPayload(form), status: 'DRAFT' })
      setSelectedReport(updated)
      setForm(reportToForm(updated))
      setReports((current) => current.map((report) => (
        report.id === updated.id
          ? {
              ...report,
              clientId: updated.clientId,
              clientNameChn: updated.clientNameChn,
              clientNameEn: updated.clientNameEn,
              dateOfVisit: updated.dateOfVisit,
              timeOfVisit: updated.timeOfVisit,
              durationOfVisit: updated.durationOfVisit,
              location: updated.location,
              programmeName: updated.programmeName,
              typeOfVisit: updated.typeOfVisit,
              status: updated.status,
              createdAt: updated.createdAt,
            }
          : report
      )))
      setIsEditing(false)
    } catch {
      setErrorMessage(t('reports.form.submitError'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSubmitDraft() {
    if (!selectedReport) return
    setIsSaving(true)
    setErrorMessage(undefined)
    try {
      const updated = await submitReport(selectedReport.id)
      setSelectedReport(updated)
      setForm(reportToForm(updated))
      setReports((current) => current.map((report) => (
        report.id === updated.id ? { ...report, status: updated.status, createdAt: updated.createdAt } : report
      )))
      setIsEditing(false)
    } catch {
      setErrorMessage(t('reports.form.submitError'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteDraft() {
    if (!selectedReport) return
    if (!window.confirm(t('reports.detail.confirmDelete', { id: `RPT-${String(selectedReport.id).padStart(4, '0')}` }))) {
      return
    }

    setIsDeleting(true)
    setErrorMessage(undefined)
    try {
      await deleteReport(selectedReport.id)
      const remaining = reports.filter((report) => report.id !== selectedReport.id)
      setReports(remaining)
      const next = remaining[0]
      if (next) {
        await loadReportDetail(next.id)
      } else {
        setSelectedReport(undefined)
        setForm(undefined)
        setSearchParams({}, { replace: true })
      }
    } catch {
      setErrorMessage(t('reports.deleteError'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="report-workspace">
      <div className="report-workspace-header">
        <h1>{t('reports.list.myTitle')}</h1>
        <button className="btn-primary" type="button" onClick={() => navigate('/reports/new')}>
          {t('reports.list.newBtn')}
        </button>
      </div>

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <div className="report-category-bar" aria-label="Report categories">
        {CATEGORY_FILTERS.map((filter) => (
          <button
            key={filter.id}
            className={activeCategory === filter.id ? 'active' : ''}
            type="button"
            onClick={() => setActiveCategory(filter.id)}
          >
            {t(filter.labelKey)}
          </button>
        ))}
      </div>

      <div className="report-filter-bar">
        <input
          aria-label={t('reports.list.search')}
          className="report-search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('reports.list.search')}
        />
        <select
          aria-label={t('reports.list.statusFilter')}
          className="report-status-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | ReportStatus)}
        >
          {STATUS_FILTERS.map((item) => (
            <option key={item.id} value={item.id}>{t(item.labelKey)}</option>
          ))}
        </select>
      </div>

      <div className="report-split-layout">
        <aside className="report-master-list" aria-label="My reports">
          {isLoadingList ? (
            <div className="report-master-state">{t('reports.list.loading')}</div>
          ) : filteredReports.length === 0 ? (
            <div className="report-master-state">{t('reports.list.empty')}</div>
          ) : (
            filteredReports.map((report) => {
              const isSelected = selectedReport?.id === report.id
              return (
                <button
                  className={'report-master-item' + (isSelected ? ' active' : '')}
                  key={report.id}
                  type="button"
                  onClick={() => void loadReportDetail(report.id)}
                >
                  <span className="report-master-name">{displayName(report, isZh) || t('reports.unnamedMonastic')}</span>
                  <span className="report-master-en">{isZh ? displayText(report.clientNameEn, '') : displayText(report.clientNameChn, '')}</span>
                  <span className="report-master-date">{formatDate(report.dateOfVisit)}</span>
                  <span className={`report-master-status report-master-status-${reportStatus(report).toLowerCase()}`}>
                    {t(`reports.status.${reportStatus(report)}`)}
                  </span>
                </button>
              )
            })
          )}
          <div className="report-master-count">{t('reports.list.count', { count: filteredReports.length })}</div>
        </aside>

        <main className="report-reader" aria-label="Report detail">
          {isLoadingDetail ? (
            <div className="report-reader-state">{t('reports.loading')}</div>
          ) : selectedReport && form ? (
            <>
              {(() => {
                const status = reportStatus(selectedReport)
                const canEdit = status === 'DRAFT'
                const canDelete = status === 'DRAFT'
                return (
                  <>
              <section className="report-reader-card report-reader-card-continuous">
                <span className={`report-status-pill report-status-pill-${status.toLowerCase()}`}>
                  {t(`reports.status.${status}`)}
                </span>
                <div className="report-reader-grid continuous">
                  <FieldView
                    label={t('reports.form.staffName')}
                    value={displayText(selectedReport.createdByName ?? selectedReport.staffName, 'Unknown')}
                  />
                  <EditableField
                    editing={isEditing && canEdit}
                    label={t('reports.form.dateOfVisit')}
                    value={formatDate(selectedReport.dateOfVisit)}
                    input={<input type="date" value={form.dateOfVisit} onChange={(e) => updateField('dateOfVisit', e.target.value)} />}
                  />
                  <EditableField
                    editing={isEditing && canEdit}
                    label={t('reports.form.timeOfVisit')}
                    value={displayText(selectedReport.timeOfVisit)}
                    input={<input value={form.timeOfVisit} onChange={(e) => updateField('timeOfVisit', e.target.value)} />}
                  />
                  <EditableField
                    editing={isEditing && canEdit}
                    label={t('reports.form.duration')}
                    value={displayText(selectedReport.durationOfVisit)}
                    input={<input value={form.durationOfVisit} onChange={(e) => updateField('durationOfVisit', e.target.value)} />}
                  />
                  <EditableField
                    editing={isEditing && canEdit}
                    label={t('reports.form.location')}
                    value={displayText(selectedReport.location)}
                    input={<input value={form.location} onChange={(e) => updateField('location', e.target.value)} />}
                    wide
                  />
                  <EditableField
                    editing={isEditing && canEdit}
                    label={t('reports.form.purpose')}
                    value={displayText(selectedReport.purposeOfVisit)}
                    input={<textarea value={form.purposeOfVisit} onChange={(e) => updateField('purposeOfVisit', e.target.value)} />}
                    wide
                  />
                  <EditableField
                    editing={isEditing && canEdit}
                    label={t('reports.form.whatWasDone')}
                    value={displayText(selectedReport.whatWasDone)}
                    input={<textarea value={form.whatWasDone} onChange={(e) => updateField('whatWasDone', e.target.value)} />}
                    wide
                  />
                  <EditableField
                    editing={isEditing && canEdit}
                    label={t('reports.form.envObs')}
                    value={displayText(selectedReport.environmentObservations)}
                    input={<textarea value={form.environmentObservations} onChange={(e) => updateField('environmentObservations', e.target.value)} />}
                  />
                  <EditableField
                    editing={isEditing && canEdit}
                    label={t('reports.form.sanghaObs')}
                    value={displayText(selectedReport.sanghaObservations)}
                    input={<textarea value={form.sanghaObservations} onChange={(e) => updateField('sanghaObservations', e.target.value)} />}
                  />
                  <EditableField
                    editing={isEditing && canEdit}
                    label={t('reports.form.otherObs')}
                    value={displayText(selectedReport.otherObservations)}
                    input={<textarea value={form.otherObservations} onChange={(e) => updateField('otherObservations', e.target.value)} />}
                    wide
                  />
                  <EditableField
                    editing={isEditing && canEdit}
                    label={t('reports.form.personalReflections')}
                    value={displayText(selectedReport.personalReflections)}
                    input={<textarea value={form.personalReflections} onChange={(e) => updateField('personalReflections', e.target.value)} />}
                    wide
                  />
                  <EditableField
                    editing={isEditing && canEdit}
                    label={t('reports.form.recommendations')}
                    value={displayText(selectedReport.recommendations)}
                    input={<textarea value={form.recommendations} onChange={(e) => updateField('recommendations', e.target.value)} />}
                  />
                  <EditableField
                    editing={isEditing && canEdit}
                    label={t('reports.form.highlights')}
                    value={displayText(selectedReport.mattersToHighlight)}
                    input={<textarea value={form.mattersToHighlight} onChange={(e) => updateField('mattersToHighlight', e.target.value)} />}
                  />
                </div>
              </section>

              <div className="report-inline-actions">
                {isEditing ? (
                  <>
                    {canDelete ? (
                      <button className="report-delete-link" type="button" disabled={isSaving || isDeleting} onClick={() => void handleDeleteDraft()}>
                        {isDeleting ? t('reports.detail.deleting') : t('reports.detail.deleteDraft')}
                      </button>
                    ) : null}
                    <button className="btn-secondary" type="button" disabled={isSaving} onClick={() => {
                      setForm(reportToForm(selectedReport))
                      setIsEditing(false)
                    }}>
                      {t('common.cancel')}
                    </button>
                    <button className="btn-primary" type="button" disabled={isSaving} onClick={() => void handleSave()}>
                      {isSaving ? t('common.saving') : t('reports.form.update')}
                    </button>
                    <button className="btn-primary" type="button" disabled={isSaving} onClick={() => void handleSubmitDraft()}>
                      {isSaving ? t('reports.form.submitting') : t('reports.form.submitFinal')}
                    </button>
                  </>
                ) : canEdit ? (
                  <>
                    {canDelete ? (
                      <button className="report-delete-link" type="button" disabled={isDeleting} onClick={() => void handleDeleteDraft()}>
                        {isDeleting ? t('reports.detail.deleting') : t('reports.detail.deleteDraft')}
                      </button>
                    ) : null}
                    <button className="btn-secondary" type="button" onClick={() => setIsEditing(true)}>
                      {t('reports.detail.edit')}
                    </button>
                    <button className="btn-primary" type="button" disabled={isSaving} onClick={() => void handleSubmitDraft()}>
                      {isSaving ? t('reports.form.submitting') : t('reports.form.submitFinal')}
                    </button>
                  </>
                ) : (
                  null
                )}
              </div>
                  </>
                )
              })()}
            </>
          ) : (
            <div className="report-reader-state">{t('reports.list.empty')}</div>
          )}
        </main>
      </div>
    </div>
  )
}

function FieldView({ label, value, wide = false }: { label: string, value: string, wide?: boolean }) {
  return (
    <div className={'report-reader-field' + (wide ? ' wide' : '')}>
      <span>{label}</span>
      <p>{value}</p>
    </div>
  )
}

function EditableField({
  editing,
  label,
  value,
  input,
  wide = false,
}: {
  editing: boolean
  label: string
  value: string
  input: ReactNode
  wide?: boolean
}) {
  return (
    <div className={'report-reader-field' + (wide ? ' wide' : '')}>
      <span>{label}</span>
      {editing ? <div className="report-inline-control">{input}</div> : <p>{value}</p>}
    </div>
  )
}
