import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorBanner, PageHeader } from '../../../shared/ui'
import { fetchDashboardData } from '../api/dashboard.api'
import type {
  DashboardAction,
  DashboardItem,
  DashboardResponse,
  DashboardSection,
  DashboardStat,
} from '../types'
import './dashboard.css'

const STAT_COPY: Record<string, { zh: string; en: string; footnote: string }> = {
  activeMonastics: {
    zh: '在册僧人',
    en: 'Active Monastics',
    footnote: '活跃会员 · Active members',
  },
  openCases: {
    zh: '进行中个案',
    en: 'Open Cases',
    footnote: '未关闭个案 · Non-closed',
  },
  urgentCases: {
    zh: '紧急个案',
    en: 'Urgent Cases',
    footnote: '红色/橙色 · RED / ORANGE',
  },
  pendingReports: {
    zh: '待处理报告',
    en: 'Pending Reports',
    footnote: '标记紧急 · Flagged urgent',
  },
}

const STAT_ORDER = ['activeMonastics', 'openCases', 'urgentCases', 'pendingReports']

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

const ACTION_COPY: Record<string, { zh: string; en: string; path: string }> = {
  new_case: {
    zh: '新建个案',
    en: 'New Case',
    path: '/cases',
  },
  add_client: {
    zh: '新增僧人',
    en: 'Add Monastic',
    path: '/clients',
  },
  submit_report: {
    zh: '提交报告',
    en: 'Submit Report',
    path: '/reports/new',
  },
}

function getSection(data: DashboardResponse | undefined, id: string): DashboardSection | undefined {
  return data?.sections.find((section) => section.id === id)
}

function statValue(stats: DashboardStat[] | undefined, id: string): string {
  return stats?.find((stat) => stat.id === id)?.value ?? '0'
}

function parseStatNumber(stats: DashboardStat[] | undefined, id: string): number {
  const value = Number(statValue(stats, id))
  return Number.isFinite(value) ? value : 0
}

function displayName(item: DashboardItem): string {
  const zh = item.clientNameChn?.trim()
  const en = item.clientNameEn?.trim()

  if (zh && en) return `${zh} / ${en}`
  return zh || en || '未命名僧人 / Unnamed monastic'
}

function displayText(value: string | null | undefined, fallback = '-'): string {
  return value?.trim() || fallback
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
  return (
    <section className="dashboard-stats" aria-label="Dashboard statistics">
      {STAT_ORDER.map((id) => {
        const copy = STAT_COPY[id]

        return (
          <article className="stat-card" key={id}>
            <div className="stat-label-zh">{copy.zh}</div>
            <div className="stat-label-en">{copy.en}</div>
            <div className="stat-value">{statValue(stats, id)}</div>
            <div className="stat-footnote">{copy.footnote}</div>
          </article>
        )
      })}
    </section>
  )
}

function SectionHeader({
  titleZh,
  titleEn,
  viewAllPath,
}: {
  titleZh: string
  titleEn: string
  viewAllPath: string
}) {
  const navigate = useNavigate()

  return (
    <div className="dashboard-panel-header">
      <div>
        <h3>{titleZh}</h3>
        <div>{titleEn}</div>
      </div>
      <button className="view-all-link" type="button" onClick={() => navigate(viewAllPath)}>
        查看全部 · View all
      </button>
    </div>
  )
}

function EmptyDashboardList({ message }: { message: string }) {
  return <div className="dashboard-empty">{message}</div>
}

function RecentCases({ items }: { items: DashboardItem[] }) {
  const navigate = useNavigate()

  return (
    <section className="dashboard-panel" aria-label="Recent Cases">
      <SectionHeader titleZh="最近个案" titleEn="Recent Cases" viewAllPath="/cases" />
      <div className="dashboard-list">
        {items.length === 0 ? (
          <EmptyDashboardList message="暂无最近个案 / No recent cases" />
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
                  <span className="row-title">{displayName(item)}</span>
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
  const navigate = useNavigate()

  return (
    <section className="dashboard-panel" aria-label="Recent Reports">
      <SectionHeader titleZh="最近探访报告" titleEn="Recent Reports" viewAllPath="/reports" />
      <div className="dashboard-list">
        {items.length === 0 ? (
          <EmptyDashboardList message="暂无最近报告 / No recent reports" />
        ) : (
          items.map((item) => (
            <button
              className="report-row"
              key={item.id}
              type="button"
              onClick={() => navigate(`/reports/${item.id}`)}
            >
              <span className="row-main">
                <span className="row-title">{displayName(item)}</span>
                <span className="row-meta">
                  {displayText(item.createdByName, 'Unknown')} · {formatDate(item.dateOfVisit)} · {displayText(item.reportType, 'Visit')}
                </span>
              </span>
              <span className="report-pill">Submitted</span>
            </button>
          ))
        )}
      </div>
    </section>
  )
}

function UrgentReportBanner({ pendingReports }: { pendingReports: number }) {
  const navigate = useNavigate()

  if (pendingReports <= 0) {
    return null
  }

  return (
    <section className="urgent-report-banner" aria-label="Urgent reports pending action">
      <div className="urgent-report-text">
        <strong>{pendingReports} 份紧急探访报告待处理</strong>
        <span> · {pendingReports} Urgent Report(s) Pending Action</span>
      </div>
      <button type="button" onClick={() => navigate('/reports')}>
        查看 · View & Resolve
      </button>
    </section>
  )
}

function QuickActions({ actions }: { actions: DashboardAction[] | undefined }) {
  const navigate = useNavigate()
  const visibleActions = (actions ?? []).filter((action) => ACTION_COPY[action.id])

  if (visibleActions.length === 0) {
    return null
  }

  return (
    <section className="quick-actions-card" aria-label="Quick Actions">
      <div className="dashboard-panel-header compact">
        <div>
          <h3>快捷操作</h3>
          <div>Quick Actions</div>
        </div>
      </div>
      <div className="quick-actions">
        {visibleActions.map((action) => {
          const copy = ACTION_COPY[action.id]

          return (
            <button
              className="quick-btn"
              key={action.id}
              type="button"
              onClick={() => navigate(copy.path)}
            >
              <span className="quick-icon" aria-hidden="true">+</span>
              <span>{copy.zh} · {copy.en}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function DashboardPage() {
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
          setErrorMessage('工作台数据加载失败，请稍后重试。 / Failed to load dashboard data.')
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
  }, [])

  const statsSection = useMemo(() => getSection(dashboardData, 'sw.stats'), [dashboardData])
  const recentCasesSection = useMemo(() => getSection(dashboardData, 'sw.recent_cases'), [dashboardData])
  const recentReportsSection = useMemo(() => getSection(dashboardData, 'sw.recent_reports'), [dashboardData])
  const quickActionsSection = useMemo(() => getSection(dashboardData, 'sw.quick_actions'), [dashboardData])
  const pendingReports = parseStatNumber(statsSection?.stats, 'pendingReports')

  return (
    <>
      <PageHeader
        titleZh="工作台"
        titleEn="Dashboard · 欢迎回来"
      />

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      {isLoading ? (
        <div className="dashboard-loading">正在加载工作台数据 / Loading dashboard data...</div>
      ) : (
        <>
          <StatCards stats={statsSection?.stats} />

          <div className="dashboard-grid">
            <RecentCases items={recentCasesSection?.items ?? []} />
            <RecentReports items={recentReportsSection?.items ?? []} />
          </div>

          <UrgentReportBanner pendingReports={pendingReports} />

          <QuickActions actions={quickActionsSection?.actions} />
        </>
      )}
    </>
  )
}
