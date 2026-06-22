import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { BackButton, ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
import { fetchReportById, fetchReports } from '../../reports/api/report.api'
import type { ReportDetail, ReportSummary } from '../../reports/types'
import { useCase, useCreateCaseNote, useDeleteCaseNote, useOwnCaseNotes } from '../../cases/hooks'
import type { ServiceEvent } from '../../cases/types'
import { fetchAssignedTasks } from '../api/task.api'
import './tasks.css'

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return value.slice(0, 10)
}

function reportClientMatches(report: ReportSummary, clientId: string | undefined): boolean {
  return Boolean(clientId && report.clientId != null && String(report.clientId) === clientId)
}

function reportMatchesTask(report: ReportSummary, caseId: string | undefined, clientId: string | undefined): boolean {
  if (caseId && report.caseId != null) {
    return String(report.caseId) === caseId
  }
  return reportClientMatches(report, clientId)
}

function reportStatusKey(report: ReportSummary | ReportDetail): 'DRAFT' | 'SUBMITTED' {
  if (report.status === 'DRAFT') return 'DRAFT'
  return 'SUBMITTED'
}

function isCurrentReportStatus(report: ReportSummary): boolean {
  return report.status === 'DRAFT' || report.status === 'SUBMITTED' || !report.status
}

function mergeReportSummary(reports: ReportSummary[], report: ReportDetail): ReportSummary[] {
  const summary = report as ReportSummary
  return [summary, ...reports.filter((item) => item.id !== summary.id)]
}

function mergeReportLists(incoming: ReportSummary[], existing: ReportSummary[]): ReportSummary[] {
  const incomingIds = new Set(incoming.map((report) => report.id))
  return [...incoming, ...existing.filter((report) => !incomingIds.has(report.id))]
}

function isReportDetail(value: unknown): value is ReportDetail {
  return Boolean(value && typeof value === 'object' && 'id' in value)
}

export function TaskDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isZh = i18n.language === 'zh'
  const [taskEvent, setTaskEvent] = useState<ServiceEvent>()
  const [isTaskLoading, setIsTaskLoading] = useState(true)
  const caseId = taskEvent ? String(taskEvent.caseId) : undefined
  const { data: caseData, isLoading } = useCase(caseId)
  const { data: notes = [], refetch: refetchNotes } = useOwnCaseNotes(caseId)
  const createNote = useCreateCaseNote()
  const deleteNote = useDeleteCaseNote(caseId)
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [content, setContent] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [errorMessage, setErrorMessage] = useState<string>()
  const returnedReport = isReportDetail(location.state && typeof location.state === 'object' ? (location.state as { report?: unknown }).report : undefined)
    ? (location.state as { report: ReportDetail }).report
    : undefined

  useEffect(() => {
    let active = true
    setIsTaskLoading(true)
    fetchAssignedTasks()
      .then((items) => {
        if (active) setTaskEvent(items.find((item) => String(item.id) === id))
      })
      .catch(() => { if (active) setErrorMessage(t('tasks.loadError')) })
      .finally(() => { if (active) setIsTaskLoading(false) })
    return () => {
      active = false
    }
  }, [id, t])

  const loadReports = useCallback(async (active = true) => {
    try {
      const data = await fetchReports({ mine: true, caseId })
      if (active) {
        setReports((prev) => mergeReportLists(data, prev))
      }
    } catch {
      if (active) setErrorMessage(t('tasks.reportsLoadError'))
    }
  }, [caseId, t])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('reportId')) return

    let active = true
    void loadReports(active)
    return () => {
      active = false
    }
  }, [loadReports, location.search])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const reportId = params.get('reportId')
    if (!reportId) return

    let active = true
    async function loadCreatedReport() {
      setErrorMessage(undefined)
      try {
        const detail = returnedReport ?? await fetchReportById(reportId!)
        if (!active) return
        setReports((prev) => mergeReportSummary(prev, detail))

        if (!active) return
        const latestReports = await fetchReports({ mine: true, caseId })
        if (!active) return
        setReports((prev) => mergeReportSummary(mergeReportLists(latestReports, prev), detail))
      } catch {
        if (active) setErrorMessage(t('reports.loadError'))
      } finally {
        if (active) navigate(location.pathname, { replace: true })
      }
    }

    void loadCreatedReport()
    return () => {
      active = false
    }
  }, [caseId, location.pathname, location.search, navigate, returnedReport, t])

  const myReports = reports.filter((report) => reportMatchesTask(report, caseId, caseData?.clientId) && isCurrentReportStatus(report))
  const returnTo = `/tasks/${taskEvent?.id ?? id ?? ''}`

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!caseId || !content.trim()) return
    setErrorMessage(undefined)
    try {
      await createNote.mutateAsync({ caseId, content, followUp })
      setContent('')
      setFollowUp('')
      await refetchNotes()
    } catch {
      setErrorMessage(t('tasks.noteError'))
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!window.confirm(t('tasks.confirmDeleteNote'))) return
    setErrorMessage(undefined)
    try {
      await deleteNote.mutateAsync(noteId)
      await refetchNotes()
    } catch {
      setErrorMessage(t('tasks.deleteNoteError'))
    }
  }

  if (isTaskLoading || isLoading) {
    return <div className="task-page"><PageHeader title={t('common.loading')} /></div>
  }

  if (!taskEvent || !caseData) {
    return (
      <div className="task-page">
        <BackButton onClick={() => navigate('/tasks')} />
        <PageHeader title={t('tasks.notFound')} />
      </div>
    )
  }

  const clientName = isZh ? caseData.clientNameChn || caseData.clientNameEn : caseData.clientNameEn || caseData.clientNameChn

  return (
    <div className="task-page">
      <BackButton onClick={() => navigate('/tasks')} />
      <PageHeader title={taskEvent.title} subtitle={`${clientName} · ${caseData.tradition}`} />
      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <SectionCard className="task-detail-card" title={t('tasks.caseOverview')} ariaLabel="Request" bodyPadding>
        <div className="task-overview-grid">
          <Info label={t('tasks.request.subject')} value={taskEvent.serviceName} />
          <Info label={t('tasks.request.time')} value={taskEvent.scheduledStart} />
          <Info label={t('tasks.request.location')} value={taskEvent.location || '-'} />
          <Info label={t('tasks.request.todo')} value={taskEvent.workDescription || '-'} wide />
          <Info label={t('tasks.request.notes')} value={taskEvent.notes || '-'} wide />
        </div>
      </SectionCard>

      <div className="task-detail-grid">
        <SectionCard title={t('tasks.myReports')} ariaLabel="My reports" bodyPadding>
          <button className="btn-primary task-report-action" type="button" onClick={() => navigate(`/reports/new?clientId=${caseData.clientId}&caseId=${caseData.id}&appointmentId=${taskEvent.id}&returnTo=${encodeURIComponent(returnTo)}&clientName=${encodeURIComponent(clientName)}`)}>
            {t('tasks.submitReport')}
          </button>
          {myReports.length === 0 ? (
            <div className="task-empty compact">{t('tasks.noReports')}</div>
          ) : (
            <div className="task-sub-list">
              {myReports.map((report) => (
                <button key={report.id} type="button" className="task-sub-row" onClick={() => navigate(`/reports/${report.id}?returnTo=${encodeURIComponent(returnTo)}`)}>
                  <span>{report.typeOfVisit || report.programmeName || t('reports.detail.title')}</span>
                  <span>{formatDate(report.dateOfVisit)} · {t(`reports.status.${reportStatusKey(report)}`)}</span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title={t('tasks.myNotes')} ariaLabel="My notes" bodyPadding>
          <form className="task-note-form" onSubmit={handleAddNote}>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={t('tasks.notePlaceholder')} />
            <input value={followUp} onChange={(event) => setFollowUp(event.target.value)} placeholder={t('tasks.followUpPlaceholder')} />
            <button className="btn-primary" type="submit" disabled={!content.trim() || createNote.isPending}>
              {createNote.isPending ? t('common.saving') : t('tasks.addNote')}
            </button>
          </form>
          <div className="task-sub-list note-list">
            {notes.length === 0 ? <div className="task-empty compact">{t('tasks.noNotes')}</div> : null}
            {notes.map((note) => (
              <article key={note.id} className="task-note">
                <div className="task-note-header">
                  <strong>{formatDate(note.createdAt)}</strong>
                  <button
                    type="button"
                    className="task-note-delete"
                    disabled={deleteNote.isPending}
                    onClick={() => void handleDeleteNote(note.id)}
                  >
                    {t('tasks.deleteNote')}
                  </button>
                </div>
                <p>{note.content}</p>
                {note.followUp ? <span>{t('cases.notes.followup')}: {note.followUp}</span> : null}
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function Info({ label, value, wide }: { label: string, value: string, wide?: boolean }) {
  return (
    <div className={`task-info${wide ? ' wide' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
