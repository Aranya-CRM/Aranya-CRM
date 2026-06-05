import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAccess } from '../../../shared/auth/useAccess'
import { ErrorBanner } from '../../../shared/ui'
import { deleteReport, fetchReportById, fetchReports, submitReport } from '../api/report.api'
import { formatServiceTitle } from '../../../shared/format/serviceTitle'
import type { ReportDetail, ReportSummary } from '../types'
import './reports.css'

type ActiveTab = 'volunteer' | 'mine'

type VolunteerSummary = {
  name: string
  count: number
  lastDate: string | null
  reports: ReportSummary[]
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
}

function volunteerStatusClass(lastDate: string | null): string {
  const d = daysSince(lastDate)
  if (d <= 30) return 'recent'
  if (d <= 90) return 'medium'
  return 'old'
}

function groupByVolunteer(reports: ReportSummary[]): VolunteerSummary[] {
  const map: Record<string, VolunteerSummary> = {}
  for (const r of reports) {
    const name = r.createdByName?.trim() || '-'
    if (!map[name]) map[name] = { name, count: 0, lastDate: null, reports: [] }
    map[name].count++
    map[name].reports.push(r)
    if (!map[name].lastDate || (r.dateOfVisit ?? '') > (map[name].lastDate ?? '')) {
      map[name].lastDate = r.dateOfVisit ?? null
    }
  }
  return Object.values(map).sort((a, b) => (b.lastDate ?? '') > (a.lastDate ?? '') ? 1 : -1)
}

export function ReportOverviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { getCap } = useAccess()
  const [searchParams, setSearchParams] = useSearchParams()

  const rawTab = searchParams.get('tab')
  const activeTab: ActiveTab = rawTab === 'mine' ? 'mine' : 'volunteer'

  const [allReports, setAllReports] = useState<ReportSummary[]>([])
  const [myReports, setMyReports] = useState<ReportSummary[]>([])

  // Volunteer tab state
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerSummary | undefined>()
  const [volSearch, setVolSearch] = useState('')

  // Mine tab state
  const [selectedReport, setSelectedReport] = useState<ReportDetail | undefined>()
  const [mineSearch, setMineSearch] = useState('')
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [isLoadingList, setIsLoadingList] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>()

  const canDeleteOwn = getCap('reports:delete') !== 'NO'

  useEffect(() => {
    let active = true
    setIsLoadingList(true)
    setSelectedVolunteer(undefined)
    setSelectedReport(undefined)

    async function load() {
      try {
        const mine = activeTab === 'mine'
        const data = await fetchReports({ mine })
        if (!active) return
        if (mine) {
          setMyReports(data)
          if (data[0]) {
            setIsLoadingDetail(true)
            try {
              const detail = await fetchReportById(data[0].id)
              if (active) setSelectedReport(detail)
            } finally {
              if (active) setIsLoadingDetail(false)
            }
          }
        } else {
          setAllReports(data)
          const groups = groupByVolunteer(data)
          if (groups[0]) setSelectedVolunteer(groups[0])
        }
        setErrorMessage(undefined)
      } catch {
        if (active) setErrorMessage(t('reports.list.loadError'))
      } finally {
        if (active) setIsLoadingList(false)
      }
    }

    void load()
    return () => { active = false }
  }, [activeTab, t])

  async function handleSelectMineReport(id: number) {
    setIsLoadingDetail(true)
    try {
      const detail = await fetchReportById(id)
      setSelectedReport(detail)
    } catch {
      setErrorMessage(t('reports.loadError'))
    } finally {
      setIsLoadingDetail(false)
    }
  }

  function switchTab(tab: ActiveTab) {
    setSelectedVolunteer(undefined)
    setSelectedReport(undefined)
    setVolSearch('')
    setMineSearch('')
    setSearchParams({ tab }, { replace: true })
  }

  async function handleSubmitDraft() {
    if (!selectedReport) return
    setIsSaving(true)
    setErrorMessage(undefined)
    try {
      const updated = await submitReport(selectedReport.id)
      setSelectedReport(updated)
      setMyReports((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, status: updated.status } : r)),
      )
    } catch {
      setErrorMessage(t('reports.form.submitError'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteDraft() {
    if (!selectedReport) return
    if (
      !window.confirm(
        t('reports.detail.confirmDelete', {
          id: `RPT-${String(selectedReport.id).padStart(4, '0')}`,
        }),
      )
    )
      return
    setIsDeleting(true)
    setErrorMessage(undefined)
    try {
      await deleteReport(selectedReport.id)
      const remaining = myReports.filter((r) => r.id !== selectedReport.id)
      setMyReports(remaining)
      setSelectedReport(undefined)
      if (remaining[0]) void handleSelectMineReport(remaining[0].id)
    } catch {
      setErrorMessage(t('reports.deleteError'))
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Volunteer tab derived state ──
  const volunteerGroups = useMemo(() => groupByVolunteer(allReports), [allReports])
  const filteredVolunteers = useMemo(() => {
    const kw = volSearch.trim().toLowerCase()
    if (!kw) return volunteerGroups
    return volunteerGroups.filter((v) => v.name.toLowerCase().includes(kw))
  }, [volunteerGroups, volSearch])

  // ── Mine tab derived state ──
  const filteredMyReports = useMemo(() => {
    const kw = mineSearch.trim().toLowerCase()
    if (!kw) return myReports
    return myReports.filter((r) => {
      const text = [r.clientNameChn, r.clientNameEn, r.typeOfVisit, r.dateOfVisit]
        .filter(Boolean).join(' ').toLowerCase()
      return text.includes(kw)
    })
  }, [myReports, mineSearch])

  const isDraftSelected = selectedReport?.status === 'DRAFT'

  return (
    <div className="report-workspace">
      <div className="report-workspace-header">
        <h1>{t('reports.overview.title')}</h1>
        <button className="btn-primary" type="button" onClick={() => navigate('/reports/new')}>
          {t('reports.list.newBtn')}
        </button>
      </div>

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <div className="report-overview-tabs">
        <button
          type="button"
          className={'report-overview-tab-btn' + (activeTab === 'volunteer' ? ' active' : '')}
          onClick={() => switchTab('volunteer')}
        >
          {t('reports.overview.tabVolunteer')}
          {volunteerGroups.length > 0 && (
            <span className="report-tab-count">{volunteerGroups.length}</span>
          )}
        </button>
        <button
          type="button"
          className={'report-overview-tab-btn' + (activeTab === 'mine' ? ' active' : '')}
          onClick={() => switchTab('mine')}
        >
          {t('reports.overview.tabMine')}
          {myReports.length > 0 && (
            <span className="report-tab-count">{myReports.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'volunteer' ? (
        <VolunteerTabContent
          isLoading={isLoadingList}
          volunteers={filteredVolunteers}
          allCount={volunteerGroups.length}
          selected={selectedVolunteer}
          search={volSearch}
          onSearchChange={setVolSearch}
          onSelect={setSelectedVolunteer}
          t={t}
          navigate={navigate}
        />
      ) : (
        <MineTabContent
          isLoading={isLoadingList}
          isLoadingDetail={isLoadingDetail}
          reports={filteredMyReports}
          totalCount={myReports.length}
          selectedReport={selectedReport}
          search={mineSearch}
          onSearchChange={setMineSearch}
          onSelect={(id) => void handleSelectMineReport(id)}
          isDraftSelected={isDraftSelected}
          canDeleteOwn={canDeleteOwn}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onEdit={() => selectedReport && navigate(`/reports/${selectedReport.id}/edit`)}
          onSubmit={() => void handleSubmitDraft()}
          onDelete={() => void handleDeleteDraft()}
          t={t}
        />
      )}
    </div>
  )
}

// ── Volunteer tab ────────────────────────────────────────────────────────────

function VolunteerTabContent({
  isLoading,
  volunteers,
  allCount,
  selected,
  search,
  onSearchChange,
  onSelect,
  t,
  navigate,
}: {
  isLoading: boolean
  volunteers: VolunteerSummary[]
  allCount: number
  selected: VolunteerSummary | undefined
  search: string
  onSearchChange: (v: string) => void
  onSelect: (v: VolunteerSummary) => void
  t: (key: string, opts?: Record<string, unknown>) => string
  navigate: (path: string) => void
}) {
  return (
    <>
      <div className="report-filter-bar" style={{ gridTemplateColumns: '1fr' }}>
        <input
          className="report-search-input"
          value={search}
          placeholder={t('reports.overview.searchVolunteer')}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={t('reports.overview.searchVolunteer')}
        />
      </div>

      <div className="report-split-layout">
        {/* Left: volunteer list */}
        <aside className="report-master-list" aria-label="Volunteer list">
          {isLoading ? (
            <div className="report-master-state">{t('reports.list.loading')}</div>
          ) : volunteers.length === 0 ? (
            <div className="report-master-state">{t('reports.overview.emptyVolunteer')}</div>
          ) : (
            volunteers.map((vol) => {
              const statusKey = volunteerStatusClass(vol.lastDate)
              const isSelected = selected?.name === vol.name
              return (
                <button
                  key={vol.name}
                  type="button"
                  className={'report-volunteer-item' + (isSelected ? ' active' : '')}
                  onClick={() => onSelect(vol)}
                >
                  <div className="report-volunteer-row">
                    <span className="report-volunteer-name">{vol.name}</span>
                    <span className={`report-volunteer-tag report-volunteer-tag-${statusKey}`}>
                      {t(`reports.overview.freshness.${statusKey}`)}
                    </span>
                  </div>
                  <div className="report-volunteer-meta">
                    <span>{t('reports.overview.reportCount', { count: vol.count })}</span>
                    <span>{t('reports.overview.lastDate')}{formatDate(vol.lastDate)}</span>
                  </div>
                </button>
              )
            })
          )}
          <div className="report-master-count">
            {t('reports.overview.volunteerCount', { count: allCount })}
          </div>
        </aside>

        {/* Right: selected volunteer's report list */}
        <main className="report-reader" aria-label="Volunteer reports">
          {!selected ? (
            <div className="report-reader-state">{t('reports.overview.selectVolunteer')}</div>
          ) : (
            <VolunteerReportList
              volunteer={selected}
              t={t}
              navigate={navigate}
            />
          )}
        </main>
      </div>
    </>
  )
}

function VolunteerReportList({
  volunteer,
  t,
  navigate,
}: {
  volunteer: VolunteerSummary
  t: (key: string, opts?: Record<string, unknown>) => string
  navigate: (path: string) => void
}) {
  const statusKey = volunteerStatusClass(volunteer.lastDate)
  return (
    <div className="report-vol-panel">
      <div className="report-vol-panel-header">
        <div className="report-vol-panel-title">
          <strong>{volunteer.name}</strong>
          <span className={`report-volunteer-tag report-volunteer-tag-${statusKey}`}>
            {t(`reports.overview.freshness.${statusKey}`)}
          </span>
          <span className="report-vol-count-label">
            {t('reports.overview.reportCount', { count: volunteer.count })}
          </span>
        </div>
        <span className="report-vol-panel-sub">
          {t('reports.overview.lastDate')}{formatDate(volunteer.lastDate)}
        </span>
      </div>

      <div className="report-vol-list">
        {volunteer.reports
          .slice()
          .sort((a, b) => (b.dateOfVisit ?? '') > (a.dateOfVisit ?? '') ? 1 : -1)
          .map((r) => {
            const status = r.status ?? 'SUBMITTED'
            return (
              <button
                key={r.id}
                type="button"
                className="report-vol-row"
                onClick={() => navigate(`/reports/${r.id}`)}
              >
                <span className="report-vol-date">{formatDate(r.dateOfVisit)}</span>
                <span className="report-vol-client">
                  {formatServiceTitle(r) || t('reports.unnamedMonastic')}
                </span>
                <span className="report-vol-type">{r.typeOfVisit ?? '-'}</span>
                <span
                  className={`report-master-status report-master-status-${status.toLowerCase()}`}
                >
                  {t(`reports.status.${status}`)}
                </span>
                <span className="report-vol-arrow">›</span>
              </button>
            )
          })}
      </div>
    </div>
  )
}

// ── Mine tab ─────────────────────────────────────────────────────────────────

function MineTabContent({
  isLoading,
  isLoadingDetail,
  reports,
  totalCount,
  selectedReport,
  search,
  onSearchChange,
  onSelect,
  isDraftSelected,
  canDeleteOwn,
  isSaving,
  isDeleting,
  onEdit,
  onSubmit,
  onDelete,
  t,
}: {
  isLoading: boolean
  isLoadingDetail: boolean
  reports: ReportSummary[]
  totalCount: number
  selectedReport: ReportDetail | undefined
  search: string
  onSearchChange: (v: string) => void
  onSelect: (id: number) => void
  isDraftSelected: boolean
  canDeleteOwn: boolean
  isSaving: boolean
  isDeleting: boolean
  onEdit: () => void
  onSubmit: () => void
  onDelete: () => void
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  return (
    <>
      <div className="report-filter-bar" style={{ gridTemplateColumns: '1fr' }}>
        <input
          className="report-search-input"
          value={search}
          placeholder={t('reports.list.search')}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={t('reports.list.search')}
        />
      </div>

      <div className="report-split-layout">
        <aside className="report-master-list" aria-label="My reports">
          {isLoading ? (
            <div className="report-master-state">{t('reports.list.loading')}</div>
          ) : reports.length === 0 ? (
            <div className="report-master-state">{t('reports.overview.emptyMine')}</div>
          ) : (
            reports.map((r) => {
              const isSelected = selectedReport?.id === r.id
              const status = r.status ?? 'SUBMITTED'
              return (
                <button
                  key={r.id}
                  type="button"
                  className={'report-master-item' + (isSelected ? ' active' : '')}
                  onClick={() => onSelect(r.id)}
                >
                  <span className="report-master-name">
                    {formatServiceTitle(r) || t('reports.unnamedMonastic')}
                  </span>
                  <span className="report-master-date">{formatDate(r.dateOfVisit)}</span>
                  <span className={`report-master-status report-master-status-${status.toLowerCase()}`}>
                    {t(`reports.status.${status}`)}
                  </span>
                </button>
              )
            })
          )}
          <div className="report-master-count">
            {t('reports.list.count', { count: totalCount })}
          </div>
        </aside>

        <main className="report-reader" aria-label="Report detail">
          {isLoadingDetail ? (
            <div className="report-reader-state">{t('reports.loading')}</div>
          ) : !selectedReport ? (
            <div className="report-reader-state">{t('reports.overview.selectHint')}</div>
          ) : (
            <>
              <ReportDetailReadView report={selectedReport} />
              {isDraftSelected && (
                <div className="report-inline-actions">
                  {canDeleteOwn && (
                    <button
                      className="report-delete-link"
                      type="button"
                      disabled={isSaving || isDeleting}
                      onClick={onDelete}
                    >
                      {isDeleting ? t('reports.detail.deleting') : t('reports.detail.deleteDraft')}
                    </button>
                  )}
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={isSaving || isDeleting}
                    onClick={onEdit}
                  >
                    {t('reports.detail.edit')}
                  </button>
                  <button
                    className="btn-primary"
                    type="button"
                    disabled={isSaving || isDeleting}
                    onClick={onSubmit}
                  >
                    {isSaving ? t('reports.form.submitting') : t('reports.form.submitFinal')}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  )
}

// ── Shared detail view ────────────────────────────────────────────────────────

function FieldView({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={'report-reader-field' + (wide ? ' wide' : '')}>
      <span>{label}</span>
      <p>{value || '-'}</p>
    </div>
  )
}

function ReportDetailReadView({ report }: { report: ReportDetail }) {
  const { t } = useTranslation()
  const status = report.status ?? 'SUBMITTED'
  return (
    <section className="report-reader-card report-reader-card-continuous">
      <span className={`report-status-pill report-status-pill-${status.toLowerCase()}`}>
        {t(`reports.status.${status}`)}
      </span>
      <div className="report-reader-grid continuous">
        <FieldView label={t('reports.form.staffName')} value={report.createdByName ?? report.staffName ?? ''} />
        <FieldView label={t('reports.form.dateOfVisit')} value={formatDate(report.dateOfVisit)} />
        <FieldView label={t('reports.form.timeOfVisit')} value={report.timeOfVisit ?? ''} />
        <FieldView label={t('reports.form.duration')} value={report.durationOfVisit ?? ''} />
        <FieldView label={t('reports.form.location')} value={report.location ?? ''} wide />
        <FieldView label={t('reports.form.purpose')} value={report.purposeOfVisit ?? ''} wide />
        <FieldView label={t('reports.form.whatWasDone')} value={report.whatWasDone ?? ''} wide />
        <FieldView label={t('reports.form.envObs')} value={report.environmentObservations ?? ''} />
        <FieldView label={t('reports.form.sanghaObs')} value={report.sanghaObservations ?? ''} />
        <FieldView label={t('reports.form.otherObs')} value={report.otherObservations ?? ''} wide />
        <FieldView label={t('reports.form.personalReflections')} value={report.personalReflections ?? ''} wide />
        <FieldView label={t('reports.form.recommendations')} value={report.recommendations ?? ''} />
        <FieldView label={t('reports.form.highlights')} value={report.mattersToHighlight ?? ''} />
      </div>
    </section>
  )
}
