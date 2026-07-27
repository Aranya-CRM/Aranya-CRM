import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ErrorBanner, PageHeader } from '../../../shared/ui'
import { reportStatusKey } from '../../reports/reportStatus'
import { fetchDashboardData } from '../api/dashboard.api'
import type {
  DashboardAction,
  DashboardItem,
  DashboardResponse,
  DashboardSection,
  DashboardStat,
} from '../types'
import './dashboard.css'


const STATUS_COPY: Record<string, string> = {
  OPEN: 'OPEN',
  IN_REVIEW: 'IN REVIEW',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  SUSPENDED: 'SUSPENDED',
  CLOSED: 'CLOSED',
}

const COLOR_CLASS: Record<string, string> = {
  RED: 'danger',
  ORANGE: 'warning',
  YELLOW: 'notice',
  GREEN: 'success',
}

const ACTION_PATHS: Record<string, string> = {
  new_case: '/cases',
  add_client: '/clients',
  submit_report: '/reports',
  view_tasks: '/reports',
}

function getSection(data: DashboardResponse | undefined, id: string): DashboardSection | undefined {
  return data?.sections.find((section) => section.id === id)
}

function formatStatus(value: string | null | undefined): string {
  if (!value) return 'UNKNOWN'
  return STATUS_COPY[value] ?? value.replaceAll('_', ' ')
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

function StatCards({ stats }: { stats: DashboardStat[] | undefined }) {
  const { t } = useTranslation()
  if (!stats || stats.length === 0) return null

  return (
    <section className="dashboard-stats" aria-label="Dashboard statistics">
      {stats.map((stat) => (
        <article className="stat-card" key={stat.id}>
          <div className="stat-label-zh">{t(`dashboard.stat.${stat.id}`, stat.id)}</div>
          <div className="stat-value">{stat.value}</div>
        </article>
      ))}
    </section>
  )
}

function VolunteerStatCards({ stats }: { stats: DashboardStat[] | undefined }) {
  const { t } = useTranslation()
  if (!stats || stats.length === 0) return null

  return (
    <section className="dashboard-stats compact" aria-label="Volunteer dashboard statistics">
      {stats.map((stat) => (
        <article className="stat-card" key={stat.id}>
          <div className="stat-label-zh">{t(`dashboard.stat.${stat.id}`, stat.id)}</div>
          <div className="stat-value">{stat.value}</div>
        </article>
      ))}
    </section>
  )
}

function SectionHeader({
  titleKey,
  viewAllPath,
}: {
  titleKey: string
  viewAllPath: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="dashboard-panel-header">
      <div>
        <h3>{t(titleKey)}</h3>
      </div>
      <button className="view-all-link" type="button" onClick={() => navigate(viewAllPath)}>
        {t('dashboard.viewAll')}
      </button>
    </div>
  )
}

function EmptyDashboardList({ message }: { message: string }) {
  return <div className="dashboard-empty">{message}</div>
}

function displayName(item: DashboardItem, isZh: boolean): string {
  const zh = item.clientNameChn?.trim()
  const en = item.clientNameEn?.trim()
  if (isZh) return zh || en || ''
  return en || zh || ''
}

// 个案/报告板块只展示会员缩写,不展示真实姓名
function displayAbbr(item: DashboardItem): string {
  return item.clientAbbr?.trim() || '-'
}

function displayText(value: string | null | undefined, fallback = '-'): string {
  return value?.trim() || fallback
}

function RecentCases({ items }: { items: DashboardItem[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section className="dashboard-panel" aria-label="Recent Cases">
      <SectionHeader titleKey="dashboard.recentCases" viewAllPath="/cases" />
      <div className="dashboard-list">
        {items.length === 0 ? (
          <EmptyDashboardList message={t('dashboard.noCases')} />
        ) : (
          items.map((item) => {
            const colorClass = COLOR_CLASS[item.colorCode ?? ''] ?? 'neutral'

            return (
              <button
                className={`case-row case-row-${colorClass}`}
                key={item.id}
                type="button"
                onClick={() => navigate(`/cases/${item.id}`)}
              >
                <span className="case-accent" aria-hidden="true" />
                <span className="row-main">
                  <span className="row-title">{displayAbbr(item)}</span>
                  <span className="row-meta">{displayText(item.caseCode)}</span>
                </span>
                <span className="status-pill">{formatStatus(item.statusCode)}</span>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}

function RecentTasks({ items }: { items: DashboardItem[] }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isZh = i18n.language === 'zh'

  return (
    <section className="dashboard-panel" aria-label="Recent Assigned Tasks">
      <SectionHeader titleKey="dashboard.recentTasks" viewAllPath="/reports" />
      <div className="dashboard-list">
        {items.length === 0 ? (
          <EmptyDashboardList message={t('dashboard.noTasks')} />
        ) : (
          items.map((item) => {
            const colorClass = COLOR_CLASS[item.colorCode ?? ''] ?? 'neutral'

            return (
              <button
                className={`case-row case-row-${colorClass}`}
                key={item.id}
                type="button"
                onClick={() => navigate(`/reports/${item.id}`)}
              >
                <span className="case-accent" aria-hidden="true" />
                <span className="row-main">
                  <span className="row-title">{displayName(item, isZh)}</span>
                  <span className="row-meta">{displayText(item.caseCode)}</span>
                </span>
                <span className="status-pill">{formatStatus(item.statusCode)}</span>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}

function RecentReports({ items }: { items: DashboardItem[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section className="dashboard-panel" aria-label="Recent Reports">
      <SectionHeader titleKey="dashboard.recentReports" viewAllPath="/reports" />
      <div className="dashboard-list">
        {items.length === 0 ? (
          <EmptyDashboardList message={t('dashboard.noReports')} />
        ) : (
          items.map((item) => (
            <button
              className="report-row"
              key={item.id}
              type="button"
              onClick={() => navigate(`/reports?selected=${item.id}`)}
            >
              <span className="row-main">
                <span className="row-title">{displayAbbr(item)}</span>
                <span className="row-meta">
                  {displayText(item.createdByName, 'Unknown')} · {formatDate(item.dateOfVisit)} · {displayText(item.reportType, 'Visit')}
                </span>
              </span>
              <span className="report-pill">{t(`reports.status.${reportStatusKey(item.statusCode)}`)}</span>
            </button>
          ))
        )}
      </div>
    </section>
  )
}

function QuickActions({ actions }: { actions: DashboardAction[] | undefined }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const visibleActions = (actions ?? []).filter((action) => ACTION_PATHS[action.id])

  if (visibleActions.length === 0) {
    return null
  }

  return (
    <section className="quick-actions-card" aria-label="Quick Actions">
      <div className="dashboard-panel-header compact">
        <div>
          <h3>{t('dashboard.quickActions')}</h3>
        </div>
      </div>
      <div className="quick-actions">
        {visibleActions.map((action) => (
          <button
            className="quick-btn"
            key={action.id}
            type="button"
            onClick={() => navigate(ACTION_PATHS[action.id])}
          >
            <span className="quick-icon" aria-hidden="true">+</span>
            <span>{t(`dashboard.action.${action.id}`)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const [dashboardData, setDashboardData] = useState<DashboardResponse>()
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    let active = true

    async function loadDashboardData() {
      setIsLoading(true)

      try {
        const data = await fetchDashboardData()
        if (active) {
          setDashboardData(data)
          setErrorMessage(undefined)
        }
      } catch {
        if (active) {
          setErrorMessage(t('dashboard.error'))
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboardData()

    return () => {
      active = false
    }
  }, [t])

  const statsSection = useMemo(() => getSection(dashboardData, 'sw.stats'), [dashboardData])
  const volunteerStatsSection = useMemo(() => getSection(dashboardData, 'volunteer.report_stats'), [dashboardData])
  const recentTasksSection = useMemo(() => getSection(dashboardData, 'volunteer.recent_tasks'), [dashboardData])
  const recentCasesSection = useMemo(() => getSection(dashboardData, 'sw.recent_cases'), [dashboardData])
  const recentReportsSection = useMemo(() => getSection(dashboardData, 'sw.recent_reports'), [dashboardData])
  const myRecentReportsSection = useMemo(() => getSection(dashboardData, 'volunteer.my_recent_reports'), [dashboardData])
  const quickActionsSection = useMemo(() => getSection(dashboardData, 'sw.quick_actions'), [dashboardData])
  const volunteerQuickActionsSection = useMemo(() => getSection(dashboardData, 'volunteer.quick_actions'), [dashboardData])

  return (
    <>
      <PageHeader title={t('dashboard.pageTitle')} />

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      {isLoading ? (
        <div className="dashboard-loading">{t('dashboard.loading')}</div>
      ) : (
        <>
          {volunteerStatsSection ? <VolunteerStatCards stats={volunteerStatsSection.stats} /> : null}
          {statsSection ? <StatCards stats={statsSection.stats} /> : null}

          <div className="dashboard-grid">
            {recentTasksSection ? <RecentTasks items={recentTasksSection.items ?? []} /> : null}
            {recentCasesSection ? <RecentCases items={recentCasesSection.items ?? []} /> : null}
            {myRecentReportsSection ? <RecentReports items={myRecentReportsSection.items ?? []} /> : null}
            {recentReportsSection ? <RecentReports items={recentReportsSection.items ?? []} /> : null}
          </div>

          <QuickActions actions={[...(volunteerQuickActionsSection?.actions ?? []), ...(quickActionsSection?.actions ?? [])]} />
        </>
      )}
    </>
  )
}
