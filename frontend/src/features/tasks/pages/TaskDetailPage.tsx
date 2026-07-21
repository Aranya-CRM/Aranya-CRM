import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAccess } from '../../../shared/auth'
import { useAuth } from '../../../contexts/AuthContext'
import { BackButton, ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
import { fetchReportById, fetchReports } from '../../reports/api/report.api'
import { isCurrentReportStatus, reportStatusKey } from '../../reports/reportStatus'
import type { ReportDetail, ReportSummary } from '../../reports/types'
import { useCase } from '../../cases/hooks'
import type { ServiceEvent } from '../../cases/types'
import { fetchEvents } from '../api/task.api'
import './tasks.css'

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return value.slice(0, 10)
}

function formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return '-'
  const startTime = start.slice(11, 16)
  const endTime = end ? end.slice(11, 16) : ''
  return endTime ? `${startTime} - ${endTime}` : startTime
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
    .join('\n\n') || '-'
}

function reportMatchesTask(report: ReportSummary, appointmentId: string | undefined): boolean {
  return Boolean(appointmentId && report.appointmentId != null && String(report.appointmentId) === appointmentId)
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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const { getCap, resolve } = useAccess()
  const { user } = useAuth()
  const canViewAllEvents = getCap('reports:view') === 'ALL'
  const canViewCreatedEvents = !canViewAllEvents && getCap('cases:services.create') !== 'NO'
  const canViewMember = resolve('clients:view') || resolve('clients:view.full')
  const [taskEvent, setTaskEvent] = useState<ServiceEvent>()
  const [isTaskLoading, setIsTaskLoading] = useState(true)
  const caseId = taskEvent ? String(taskEvent.caseId) : undefined
  const { data: caseData, isLoading } = useCase(caseId)
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [errorMessage, setErrorMessage] = useState<string>()
  const returnedReport = isReportDetail(location.state && typeof location.state === 'object' ? (location.state as { report?: unknown }).report : undefined)
    ? (location.state as { report: ReportDetail }).report
    : undefined

  useEffect(() => {
    let active = true
    setIsTaskLoading(true)
    async function loadEvent() {
      try {
        const primary = await fetchEvents(canViewAllEvents ? 'all' : 'mine')
        let match = primary.find((item) => String(item.id) === id)
        if (!match && canViewCreatedEvents) {
          const created = await fetchEvents('created')
          match = created.find((item) => String(item.id) === id)
        }
        if (active) setTaskEvent(match)
      } catch {
        if (active) setErrorMessage(t('tasks.loadError'))
      } finally {
        if (active) setIsTaskLoading(false)
      }
    }
    void loadEvent()
    return () => {
      active = false
    }
  }, [canViewAllEvents, canViewCreatedEvents, id, t])

  const loadReports = useCallback(async (active = true) => {
    if (!taskEvent?.id) return
    try {
      const data = await fetchReports({ mine: true, appointmentId: taskEvent?.id })
      if (active) {
        setReports((prev) => mergeReportLists(data, prev))
      }
    } catch {
      if (active) setErrorMessage(t('tasks.reportsLoadError'))
    }
  }, [taskEvent?.id, t])

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
    if (!reportId || !taskEvent?.id) return

    let active = true
    async function loadCreatedReport() {
      setErrorMessage(undefined)
      try {
        const detail = returnedReport ?? await fetchReportById(reportId!)
        if (!active) return
        setReports((prev) => mergeReportSummary(prev, detail))

        if (!active) return
        const latestReports = await fetchReports({ mine: true, appointmentId: taskEvent?.id })
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
  }, [location.pathname, location.search, navigate, returnedReport, t, taskEvent?.id])

  useEffect(() => {
    if (!isTaskLoading && !errorMessage && !taskEvent) {
      navigate('/reports', { replace: true })
    }
  }, [errorMessage, isTaskLoading, navigate, taskEvent])

  const myReports = reports.filter((report) => reportMatchesTask(report, taskEvent ? String(taskEvent.id) : id) && isCurrentReportStatus(report.status))
  const hasSubmittedReport = myReports.some((report) => String(report.status ?? '').toUpperCase() === 'SUBMITTED')
  const returnTo = `/reports/${taskEvent?.id ?? id ?? ''}`
  const isAssignedToMe = Boolean(user?.id != null && taskEvent && (
    isEventParticipant(taskEvent, String(user.id))
    || String(caseData?.socialWorkerId ?? '') === String(user.id)
  ))

  if (isTaskLoading || isLoading) {
    return <div className="task-page"><PageHeader title={t('common.loading')} /></div>
  }

  if (!taskEvent || !caseData) {
    return (
      <div className="task-page">
        <BackButton onClick={() => navigate('/reports')} />
        <PageHeader title={t('tasks.notFound')} />
      </div>
    )
  }

  return (
    <div className="task-page">
      <BackButton onClick={() => navigate('/reports')} />
      <PageHeader title={taskEvent.title} subtitle={caseData.caseNo} />
      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <SectionCard className="task-detail-card" title={t('tasks.caseOverview')} ariaLabel="Request" bodyPadding>
        <div className="task-overview-grid">
          <Info label={t('tasks.request.subject')} value={taskEvent.title} />
          {canViewMember ? (
            <ActionInfo label={t('reports.form.member')} value={t('tasks.viewMember')} onClick={() => navigate(`/clients/${caseData.clientId}`)} />
          ) : null}
          <Info label={t('reports.form.case')} value={caseData.caseNo || '-'} />
          <Info label={t('reports.form.dateOfVisit')} value={formatDate(taskEvent.scheduledStart)} />
          <Info label={t('reports.form.timeOfVisit')} value={formatTimeRange(taskEvent.scheduledStart, taskEvent.scheduledEnd)} />
          <Info label={t('tasks.request.location')} value={taskEvent.location || '-'} />
          <Info label={t('tasks.request.address')} value={taskEvent.address || '-'} wide multiline />
          <Info label={t('tasks.request.content')} value={eventContent(taskEvent)} wide />
        </div>
      </SectionCard>

      <SectionCard className="task-detail-card" title={t('tasks.myReports')} ariaLabel="My reports" bodyPadding>
        {isAssignedToMe && !hasSubmittedReport ? (
          <button className="btn-primary task-report-action" type="button" onClick={() => navigate(`/reports/new?appointmentId=${taskEvent.id}&returnTo=${encodeURIComponent(returnTo)}`)}>
            {t('tasks.submitReport')}
          </button>
        ) : !isAssignedToMe ? (
          <div className="task-empty compact">{t('tasks.reportOnlyAssigned')}</div>
        ) : null}
        {myReports.length === 0 ? (
          <div className="task-empty compact">{t('tasks.noReports')}</div>
        ) : (
          <div className="task-sub-list">
            {myReports.map((report) => (
              <button key={report.id} type="button" className="task-sub-row" onClick={() => navigate(`/reports/report/${report.id}?returnTo=${encodeURIComponent(returnTo)}`)}>
                <span>{report.eventTitle || t('reports.detail.title')}</span>
                <span>{formatDate(report.dateOfVisit)} · {t(`reports.status.${reportStatusKey(report.status)}`)}</span>
              </button>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function isEventParticipant(event: ServiceEvent, userId: string): boolean {
  return (event.participantUserIds ?? []).map(String).includes(userId)
    || (event.assignedUserId != null && String(event.assignedUserId) === userId)
}

function Info({ label, value, wide, multiline }: { label: string, value: string, wide?: boolean, multiline?: boolean }) {
  return (
    <div className={`task-info${wide ? ' wide' : ''}${multiline ? ' multiline' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ActionInfo({ label, value, onClick }: { label: string, value: string, onClick: () => void }) {
  return (
    <div className="task-info">
      <span>{label}</span>
      <button className="task-info-link" type="button" onClick={onClick}>{value}</button>
    </div>
  )
}
