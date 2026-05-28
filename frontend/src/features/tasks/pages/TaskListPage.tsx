import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
import type { DashboardItem } from '../../dashboard/types'
import { fetchAssignedTasks } from '../api/task.api'
import './tasks.css'

function displayName(item: DashboardItem, isZh: boolean): string {
  const zh = item.clientNameChn?.trim()
  const en = item.clientNameEn?.trim()
  if (isZh) return zh || en || ''
  return en || zh || ''
}

export function TaskListPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isZh = i18n.language === 'zh'
  const [tasks, setTasks] = useState<DashboardItem[]>([])
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
                <span className={`task-color task-color-${(task.colorCode ?? 'GREY').toLowerCase()}`} />
                <span className="task-row-main">
                  <span className="task-title">{task.caseCode}</span>
                  <span className="task-meta">{displayName(task, isZh)} · {task.statusCode ?? 'OPEN'}</span>
                </span>
                <span className="task-open">{t('tasks.open')}</span>
              </button>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
