import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
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
  const { user } = useAuth()
  const { getCap } = useAccess()
  const canViewAllEvents = getCap('reports:view') === 'ALL'
  const canViewCreatedEvents = !canViewAllEvents && getCap('cases:services.create') !== 'NO'
  const secondaryScope: 'all' | 'created' = canViewAllEvents ? 'all' : 'created'
  const [scope, setScope] = useState<'mine' | 'all' | 'created'>('mine')
  const [tasks, setTasks] = useState<ServiceEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>()

  const loadTasks = useCallback(async (shouldApply: () => boolean = () => true) => {
    setIsLoading(true)
    try {
      const data = await fetchEvents(scope)
      if (shouldApply()) {
        setTasks(data)
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
  }, [scope, t])

  useEffect(() => {
    if (scope === 'all' && !canViewAllEvents) setScope('mine')
    if (scope === 'created' && !canViewCreatedEvents) setScope('mine')
  }, [canViewAllEvents, canViewCreatedEvents, scope])

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
      {canViewAllEvents || canViewCreatedEvents ? (
        <div className="task-scope-tabs" role="tablist" aria-label={t('tasks.scopeLabel')}>
          <button
            type="button"
            className={scope === 'mine' ? 'active' : ''}
            onClick={() => setScope('mine')}
          >
            {t('tasks.myEvents')}
          </button>
          <button
            type="button"
            className={scope === secondaryScope ? 'active' : ''}
            onClick={() => setScope(secondaryScope)}
          >
            {canViewAllEvents ? t('tasks.allEvents') : t('tasks.otherEvents')}
          </button>
        </div>
      ) : null}
      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      <SectionCard className="task-list-card" ariaLabel="Events" bodyPadding>
        {isLoading ? (
          <div className="task-empty">{t('common.loading')}</div>
        ) : tasks.length === 0 ? (
          <div className="task-empty">{t('tasks.empty')}</div>
        ) : (
          <div className="task-list">
            {tasks.map((task) => (
              <button className="task-row" key={task.id} type="button" onClick={() => navigate(`/reports/${task.id}`)}>
                <span className="task-color task-color-green" />
                <span className="task-row-main">
                  <span className="task-title">{task.title}</span>
                  <span className="task-meta">{formatDate(task.scheduledStart)} · {task.location ?? '-'}</span>
                  {scope !== 'mine' ? (
                    <span className="task-meta">{t('tasks.assignedTo')}: {task.assignedUserName ?? '-'}</span>
                  ) : null}
                </span>
                {user?.id != null && task.assignedUserId != null && String(task.assignedUserId) === String(user.id) && task.reminderState && REMINDER_BADGE[task.reminderState] ? (
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
