import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
import type { ServiceEvent } from '../../cases/types'
import { fetchAssignedTasks } from '../api/task.api'
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
  const [tasks, setTasks] = useState<ServiceEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    let active = true

    async function loadTasks() {
      setIsLoading(true)
      try {
        const data = await fetchAssignedTasks()
        if (active) {
          setTasks(data)
          setErrorMessage(undefined)
        }
      } catch {
        if (active) {
          setErrorMessage(t('tasks.loadError'))
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadTasks()

    return () => {
      active = false
    }
  }, [t])

  return (
    <div className="task-page">
      <PageHeader title={t('tasks.title')} subtitle={t('tasks.count', { count: tasks.length })} />
      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      <SectionCard className="task-list-card" ariaLabel="Assigned tasks" bodyPadding>
        {isLoading ? (
          <div className="task-empty">{t('common.loading')}</div>
        ) : tasks.length === 0 ? (
          <div className="task-empty">{t('tasks.empty')}</div>
        ) : (
          <div className="task-list">
            {tasks.map((task) => (
              <button className="task-row" key={task.id} type="button" onClick={() => navigate(`/tasks/${task.id}`)}>
                <span className="task-color task-color-green" />
                <span className="task-row-main">
                  <span className="task-title">{task.title}</span>
                  <span className="task-meta">{formatDate(task.scheduledStart)} · {task.location ?? '-'}</span>
                </span>
                {task.reminderState && REMINDER_BADGE[task.reminderState] ? (
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
