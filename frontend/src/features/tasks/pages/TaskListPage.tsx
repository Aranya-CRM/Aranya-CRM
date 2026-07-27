import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAccess } from '../../../shared/auth'
import { ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
import type { ServiceEvent } from '../../cases/types'
import { fetchEvents } from '../api/task.api'
import './tasks.css'

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return value.slice(0, 10)
}

// 只对需要提醒的状态显示徽标(DONE/UPCOMING 不显示)
const REMINDER_BADGE: Record<string, string> = {
  PENDING: 'pending',
  DUE_SOON: 'due-soon',
  OVERDUE: 'overdue',
}

export function TaskListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { getCap } = useAccess()
  const canViewAllEvents = getCap('reports:view') === 'ALL'
  const canViewCreatedEvents = !canViewAllEvents && getCap('cases:services.create') !== 'NO'
  const [status, setStatus] = useState<'incomplete' | 'completed'>('incomplete')
  const [events, setEvents] = useState<ServiceEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>()
  const tasks = events.filter((event) => status === 'completed' ? event.reportSubmitted : !event.reportSubmitted)

  const loadTasks = useCallback(async (shouldApply: () => boolean = () => true) => {
    setIsLoading(true)
    try {
      const data = canViewAllEvents
        ? await fetchEvents('all')
        : canViewCreatedEvents
          ? mergeEvents(await Promise.all([fetchEvents('mine'), fetchEvents('created')]))
          : await fetchEvents('mine')
      if (shouldApply()) {
        setEvents(data)
        setErrorMessage(undefined)
      }
    } catch {
      if (shouldApply()) {
        setErrorMessage(t('tasks.loadError'))
      }
    } finally {
      if (shouldApply()) {
        setIsLoading(false)
      }
    }
  }, [canViewAllEvents, canViewCreatedEvents, t])

  useEffect(() => {
    let active = true
    void loadTasks(() => active)

    return () => {
      active = false
    }
  }, [loadTasks])

  useEffect(() => {
    function refreshOnFocus() {
      void loadTasks()
    }

    window.addEventListener('focus', refreshOnFocus)
    return () => window.removeEventListener('focus', refreshOnFocus)
  }, [loadTasks])

  return (
    <div className="task-page">
      <PageHeader title={t('tasks.title')} subtitle={t('tasks.count', { count: tasks.length })} />
      <div className="task-scope-tabs" role="tablist" aria-label={t('tasks.statusLabel')}>
        <button
          type="button"
          role="tab"
          aria-selected={status === 'incomplete'}
          className={status === 'incomplete' ? 'active' : ''}
          onClick={() => setStatus('incomplete')}
        >
          {t('tasks.incompleteEvents')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={status === 'completed'}
          className={status === 'completed' ? 'active' : ''}
          onClick={() => setStatus('completed')}
        >
          {t('tasks.completedEvents')}
        </button>
      </div>
      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      <SectionCard className="task-list-card" ariaLabel="Events" bodyPadding>
        {isLoading ? (
          <div className="task-empty">{t('common.loading')}</div>
        ) : tasks.length === 0 ? (
          <div className="task-empty">{t(status === 'completed' ? 'tasks.emptyCompleted' : 'tasks.emptyIncomplete')}</div>
        ) : (
          <div className="task-list">
            {tasks.map((task) => (
              <button className="task-row" key={task.id} type="button" onClick={() => navigate(`/reports/${task.id}`)}>
                <span className="task-color task-color-green" />
                <span className="task-row-main">
                  <span className="task-title">{task.title}</span>
                  <span className="task-meta">{formatDate(task.scheduledStart)} · {task.location ?? '-'}</span>
                  <span className="task-meta">{t('tasks.assignedTo')}: {eventParticipantNames(task)}</span>
                </span>
                {!task.reportSubmitted && task.reminderState && REMINDER_BADGE[task.reminderState] ? (
                  <span className={`task-reminder task-reminder-${REMINDER_BADGE[task.reminderState]}`}>
                    {t(`tasks.reminder.${task.reminderState}`)}
                  </span>
                ) : null}
                <span className="task-open">{t('tasks.open')}</span>
              </button>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function mergeEvents(eventGroups: ServiceEvent[][]): ServiceEvent[] {
  const eventsById = new Map<string, ServiceEvent>()
  eventGroups.flat().forEach((event) => eventsById.set(String(event.id), event))
  return [...eventsById.values()]
}

function eventParticipantNames(task: ServiceEvent): string {
  const names = task.participantUsers?.map((item) => item.fullName || item.email || String(item.id)).filter(Boolean) ?? []
  if (names.length > 0) return names.join(', ')
  return task.assignedUserName ?? '-'
}
