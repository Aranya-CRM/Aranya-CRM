import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

const ACTION_PATHS: Record<string, string> = {
  new_case: '/cases',
  add_client: '/clients',
  submit_report: '/reports/new',
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

  return (
    <section className="dashboard-stats" aria-label="Dashboard statistics">
      {STAT_ORDER.map((id) => (
        <article className="stat-card" key={id}>
          <div className="stat-label-zh">{t(`dashboard.stat.${id}`)}</div>
          <div className="stat-value">{statValue(stats, id)}</div>
          <div className="stat-footnote">{t(`dashboard.stat.${id}_footnote`)}</div>
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

function displayText(value: string | null | undefined, fallback = '-'): string {
  return value?.trim() || fallback
}

function RecentCases({ items }: { items: DashboardItem[] }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isZh = i18n.language === 'zh'

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
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isZh = i18n.language === 'zh'

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
              onClick={() => navigate(`/reports/${item.id}`)}
            >
              <span className="row-main">
                <span className="row-title">{displayName(item, isZh)}</span>
                <span className="row-meta">
                  {displayText(item.createdByName, 'Unknown')} · {formatDate(item.dateOfVisit)} · {displayText(item.reportType, 'Visit')}
                </span>
              </span>
              <span className="report-pill">{t('reports.detail.submitted')}</span>
            </button>
          ))
        )}
      </div>
    </section>
  )
}

function UrgentReportBanner({ pendingReports }: { pendingReports: number }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (pendingReports <= 0) {
    return null
  }

  return (
    <section className="urgent-report-banner" aria-label="Urgent reports pending action">
      <div className="urgent-report-text">
        <strong>{t('dashboard.urgentBanner', { count: pendingReports })}</strong>
      </div>
      <button type="button" onClick={() => navigate('/reports')}>
        {t('dashboard.viewResolve')}
      </button>
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
  const recentCasesSection = useMemo(() => getSection(dashboardData, 'sw.recent_cases'), [dashboardData])
  const recentReportsSection = useMemo(() => getSection(dashboardData, 'sw.recent_reports'), [dashboardData])
  const quickActionsSection = useMemo(() => getSection(dashboardData, 'sw.quick_actions'), [dashboardData])
  const pendingReports = parseStatNumber(statsSection?.stats, 'pendingReports')

  return (
    <>
      <PageHeader title={t('dashboard.pageTitle')} />

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      {isLoading ? (
        <div className="dashboard-loading">{t('dashboard.loading')}</div>
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
