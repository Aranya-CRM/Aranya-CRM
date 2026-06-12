import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAccess } from '../../../shared/auth/useAccess'
import { useAuth } from '../../../contexts/AuthContext'
import { ErrorBanner } from '../../../shared/ui'
import { approveReport, deleteReport, fetchReportById, fetchReports, submitReport } from '../api/report.api'
import { formatServiceTitle } from '../../../shared/format/serviceTitle'
import type { ReportDetail, ReportStatus, ReportSummary } from '../types'
import './reports.css'

type T = (key: string, opts?: Record<string, unknown>) => string

// 文件夹（状态分类）展示顺序：待审批 → 草稿 → 退回 → 已审批
const FOLDER_ORDER: ReportStatus[] = ['SUBMITTED', 'DRAFT', 'RETURNED', 'ARCHIVED']

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 用于排序的时间：最近活动优先（创建时间 > 报告时间 > 探访日期）。 */
function reportTime(r: ReportSummary): string {
  return r.createdAt ?? r.reportTimestamp ?? r.dateOfVisit ?? ''
}

function groupByStatus(reports: ReportSummary[]): Record<ReportStatus, ReportSummary[]> {
  const groups: Record<ReportStatus, ReportSummary[]> = { DRAFT: [], SUBMITTED: [], ARCHIVED: [], RETURNED: [] }
  for (const r of reports) {
    const status = (r.status ?? 'SUBMITTED') as ReportStatus
    ;(groups[status] ?? groups.SUBMITTED).push(r)
  }
  for (const status of Object.keys(groups) as ReportStatus[]) {
    // 每个文件夹内按时间倒序，最新在最上
    groups[status].sort((a, b) => {
      const ta = reportTime(a)
      const tb = reportTime(b)
      return tb > ta ? 1 : tb < ta ? -1 : 0
    })
  }
  return groups
}

export function ReportOverviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { getCap } = useAccess()
  const { user } = useAuth()
  const myId = user?.id ?? null

  // ── 能力字典驱动（去角色化）：不判断身份，只读能力键 ──
  const canCreate = getCap('reports:create') !== 'NO'
  const canApprove = getCap('reports:approve_archive') !== 'NO'
  const canUpdate = getCap('reports:update') !== 'NO'
  const canDeleteAny = getCap('reports:delete') !== 'NO'

  const [reports, setReports] = useState<ReportSummary[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportDetail | undefined>()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  // ── 取数：自己的全状态报告 ∪（有审批权时）待审批队列，按 id 去重 ──
  useEffect(() => {
    let active = true
    setIsLoadingList(true)
    setSelectedReport(undefined)

    async function load() {
      try {
        const own = await fetchReports({ mine: true })
        let queue: ReportSummary[] = []
        if (canApprove) {
          try {
            queue = await fetchReports()
          } catch {
            queue = []
          }
        }
        if (!active) return

        const byId = new Map<number, ReportSummary>()
        for (const r of [...own, ...queue]) byId.set(r.id, r)
        const merged = [...byId.values()]
        setReports(merged)

        // 默认展开第一个非空文件夹，并选中其最新一份
        const grouped = groupByStatus(merged)
        const firstFolder = FOLDER_ORDER.find((s) => grouped[s].length > 0)
        if (firstFolder) {
          setExpanded({ [firstFolder]: true })
          const first = grouped[firstFolder][0]
          if (first) {
            setIsLoadingDetail(true)
            try {
              const detail = await fetchReportById(first.id)
              if (active) setSelectedReport(detail)
            } finally {
              if (active) setIsLoadingDetail(false)
            }
          }
        }
        setErrorMessage(undefined)
      } catch {
        if (active) setErrorMessage(t('reports.list.loadError'))
      } finally {
        if (active) setIsLoadingList(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [canApprove, t])

  const grouped = useMemo(() => groupByStatus(reports), [reports])

  function toggleFolder(status: ReportStatus) {
    setExpanded((prev) => ({ ...prev, [status]: !prev[status] }))
  }

  async function selectReport(id: number) {
    setIsLoadingDetail(true)
    setErrorMessage(undefined)
    try {
      const detail = await fetchReportById(id)
      setSelectedReport(detail)
    } catch {
      setErrorMessage(t('reports.loadError'))
    } finally {
      setIsLoadingDetail(false)
    }
  }

  function patchStatus(id: number, status: ReportStatus) {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
  }

  async function handleApprove() {
    if (!selectedReport) return
    setIsApproving(true)
    setErrorMessage(undefined)
    try {
      const updated = await approveReport(selectedReport.id)
      setSelectedReport(updated)
      patchStatus(updated.id, (updated.status ?? 'ARCHIVED') as ReportStatus)
    } catch {
      setErrorMessage(t('reports.detail.approveError'))
    } finally {
      setIsApproving(false)
    }
  }

  async function handleSubmit() {
    if (!selectedReport) return
    setIsSaving(true)
    setErrorMessage(undefined)
    try {
      const updated = await submitReport(selectedReport.id)
      setSelectedReport(updated)
      patchStatus(updated.id, (updated.status ?? 'SUBMITTED') as ReportStatus)
    } catch {
      setErrorMessage(t('reports.form.submitError'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedReport) return
    if (!window.confirm(t('reports.detail.confirmDelete', { id: `RPT-${String(selectedReport.id).padStart(4, '0')}` }))) return
    setIsDeleting(true)
    setErrorMessage(undefined)
    try {
      await deleteReport(selectedReport.id)
      const remainingId = selectedReport.id
      setReports((prev) => prev.filter((r) => r.id !== remainingId))
      setSelectedReport(undefined)
    } catch {
      setErrorMessage(t('reports.deleteError'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="report-mailbox">
      <div className="report-workspace-header">
        <h1>{t('reports.mailbox.title')}</h1>
        {canCreate ? (
          <button className="btn-primary" type="button" onClick={() => navigate('/reports/new')}>
            {t('reports.list.newBtn')}
          </button>
        ) : null}
      </div>

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <div className="report-mailbox-body">
        <aside className="report-folders" aria-label={t('reports.mailbox.title')}>
          {FOLDER_ORDER.map((status) => (
            <CategorySection
              key={status}
              status={status}
              reports={grouped[status]}
              expanded={!!expanded[status]}
              isLoading={isLoadingList}
              selectedId={selectedReport?.id}
              onToggle={() => toggleFolder(status)}
              onSelect={(id) => void selectReport(id)}
              t={t}
            />
          ))}
        </aside>

        <main className="report-reader" aria-label={t('reports.detail.title')}>
          {isLoadingDetail ? (
            <div className="report-reader-state">{t('reports.loading')}</div>
          ) : !selectedReport ? (
            <div className="report-reader-state">{t('reports.mailbox.selectHint')}</div>
          ) : (
            <DetailPane
              report={selectedReport}
              myId={myId}
              canApprove={canApprove}
              canUpdate={canUpdate}
              canDeleteAny={canDeleteAny}
              isSaving={isSaving}
              isDeleting={isDeleting}
              isApproving={isApproving}
              onEdit={() => navigate(`/reports/${selectedReport.id}/edit`)}
              onSubmit={() => void handleSubmit()}
              onDelete={() => void handleDelete()}
              onApprove={() => void handleApprove()}
              t={t}
            />
          )}
        </main>
      </div>
    </div>
  )
}

// ── 左栏：可折叠状态文件夹（邮箱式手风琴），报告简略块内嵌 ───────────────────────
function CategorySection({
  status,
  reports,
  expanded,
  isLoading,
  selectedId,
  onToggle,
  onSelect,
  t,
}: {
  status: ReportStatus
  reports: ReportSummary[]
  expanded: boolean
  isLoading: boolean
  selectedId: number | undefined
  onToggle: () => void
  onSelect: (id: number) => void
  t: T
}) {
  return (
    <div className={'report-folder' + (expanded ? ' open' : '')}>
      <button className="report-folder-header" type="button" onClick={onToggle} aria-expanded={expanded}>
        <span className="report-folder-caret">{expanded ? '▾' : '▸'}</span>
        <span className="report-folder-name">{t(`reports.folder.${status}`)}</span>
        <span className="report-folder-count">{reports.length}</span>
      </button>
      {expanded ? (
        <div className="report-folder-body">
          {isLoading ? (
            <div className="report-folder-state">{t('reports.list.loading')}</div>
          ) : reports.length === 0 ? (
            <div className="report-folder-state">{t('reports.mailbox.empty')}</div>
          ) : (
            reports.map((r) => (
              <ReportSummaryCard
                key={r.id}
                report={r}
                active={r.id === selectedId}
                onClick={() => onSelect(r.id)}
                t={t}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

function ReportSummaryCard({
  report,
  active,
  onClick,
  t,
}: {
  report: ReportSummary
  active: boolean
  onClick: () => void
  t: T
}) {
  return (
    <button className={'report-card' + (active ? ' active' : '')} type="button" onClick={onClick}>
      <span className="report-card-date">{formatDate(report.dateOfVisit)}</span>
      <span className="report-card-title">{formatServiceTitle(report) || t('reports.unnamedMonastic')}</span>
      <span className="report-card-sub">{report.caseCode ?? report.createdByName ?? report.staffName ?? '-'}</span>
    </button>
  )
}

// ── 右栏：详情 + 上下文动作（能力 × 状态 驱动） ──────────────────────────────────
function DetailPane({
  report,
  myId,
  canApprove,
  canUpdate,
  canDeleteAny,
  isSaving,
  isDeleting,
  isApproving,
  onEdit,
  onSubmit,
  onDelete,
  onApprove,
  t,
}: {
  report: ReportDetail
  myId: number | null
  canApprove: boolean
  canUpdate: boolean
  canDeleteAny: boolean
  isSaving: boolean
  isDeleting: boolean
  isApproving: boolean
  onEdit: () => void
  onSubmit: () => void
  onDelete: () => void
  onApprove: () => void
  t: T
}) {
  const status = (report.status ?? 'SUBMITTED') as ReportStatus
  const isOwn = report.createdById != null && report.createdById === myId
  const isEditable = status === 'DRAFT' || status === 'RETURNED'

  const showEdit = isOwn && isEditable && canUpdate
  const showSubmit = isOwn && isEditable
  const showDelete = (isOwn && status === 'DRAFT') || canDeleteAny
  const showApprove = status === 'SUBMITTED' && canApprove
  const busy = isSaving || isDeleting || isApproving

  return (
    <>
      <ReportDetailReadView report={report} />
      <div className="report-inline-actions">
        {status === 'SUBMITTED' && !canApprove ? (
          <span className="report-waiting-hint">{t('reports.mailbox.waitingApproval')}</span>
        ) : null}
        {showDelete ? (
          <button className="report-delete-link" type="button" disabled={busy} onClick={onDelete}>
            {isDeleting ? t('reports.detail.deleting') : t('reports.detail.delete')}
          </button>
        ) : null}
        {showEdit ? (
          <button className="btn-secondary" type="button" disabled={busy} onClick={onEdit}>
            {t('reports.detail.edit')}
          </button>
        ) : null}
        {showSubmit ? (
          <button className="btn-primary" type="button" disabled={busy} onClick={onSubmit}>
            {isSaving ? t('reports.form.submitting') : t('reports.form.submitFinal')}
          </button>
        ) : null}
        {showApprove ? (
          <button className="btn-primary" type="button" disabled={busy} onClick={onApprove}>
            {isApproving ? t('reports.detail.approving') : t('reports.detail.approve')}
          </button>
        ) : null}
      </div>
    </>
  )
}

// ── 共享：报告详情只读视图 ────────────────────────────────────────────────────
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
  const status = (report.status ?? 'SUBMITTED') as ReportStatus
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
