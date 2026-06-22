import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getApiErrorCode } from '../../../shared/api'
import { useAccess } from '../../../shared/auth'
import { ErrorBanner, PageHeader } from '../../../shared/ui'
import { sendInviteSetupEmail } from '../../auth/api/auth'
import { useInviteUser } from '../../users/hooks'
import { inviteErrorKey } from '../../users/inviteErrors'
import type { UserRole } from '../../users/types'
import { fetchDashboardData } from '../api/dashboard.api'
import type {
  DashboardAction,
  DashboardItem,
  DashboardResponse,
  DashboardSection,
  DashboardStat,
} from '../types'
import './dashboard.css'
import '../../users/pages/users.css'

const INVITE_ROLE_VALUES: UserRole[] = ['MANAGER', 'SOCIAL_WORKER', 'VOLUNTEER']


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
  view_tasks: '/tasks',
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
      <SectionHeader titleKey="dashboard.recentTasks" viewAllPath="/tasks" />
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
                onClick={() => navigate(`/tasks/${item.id}`)}
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
              <span className="report-pill">{t(`reports.status.${item.statusCode ?? 'SUBMITTED'}`)}</span>
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

function InviteUserControl() {
  const { t } = useTranslation()
  const { getCap } = useAccess()
  const inviteUser = useInviteUser()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('VOLUNTEER')
  const [formError, setFormError] = useState<string>()

  // 仅有用户管理能力的角色(MANAGER 等)可见;弹窗只收邮箱 + 身份,
  // username/fullName 由后端用邮箱前缀兜底,待用户首次登录后自行补填。
  if (getCap('admin:users.manage') === 'NO') return null

  function openModal() {
    setEmail('')
    setRole('VOLUNTEER')
    setFormError(undefined)
    setOpen(true)
  }

  function closeModal() {
    if (inviteUser.isPending) return
    setOpen(false)
    setFormError(undefined)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(undefined)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setFormError(t('users.error.invite'))
      return
    }

    try {
      await inviteUser.mutateAsync({ email: trimmedEmail, roles: [role] })
    } catch (error) {
      setFormError(t(inviteErrorKey(getApiErrorCode(error))))
      return
    }

    // 账号已建,触发 Firebase 发"设置密码"邮件(失败不阻断邀请流程)
    try {
      await sendInviteSetupEmail(trimmedEmail)
    } catch {
      window.alert(t('users.error.inviteEmail'))
    }
    setOpen(false)
  }

  return (
    <>
      <button className="users-primary-button" type="button" onClick={openModal}>
        + {t('users.addBtn')}
      </button>

      {open ? (
        <div className="users-modal-backdrop" role="presentation" onMouseDown={closeModal}>
          <form
            className="users-modal"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={submit}
          >
            <header className="users-modal-header">
              <div>
                <h2>{t('users.modal.addTitle')}</h2>
              </div>
              <button className="users-modal-close" type="button" aria-label="Close" onClick={closeModal}>
                x
              </button>
            </header>

            <div className="users-modal-body">
              <label className="users-form-field">
                <span>{t('users.modal.email')}</span>
                <input
                  className="users-form-input"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <fieldset className="users-role-fieldset">
                <legend>{t('users.modal.roles')}</legend>
                <div className="users-role-options">
                  {INVITE_ROLE_VALUES.map((roleValue) => (
                    <label className="users-role-option" key={roleValue}>
                      <input
                        type="radio"
                        name="dashboard-invite-role"
                        checked={role === roleValue}
                        onChange={() => setRole(roleValue)}
                      />
                      <span>{t(`users.role.${roleValue}`)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {formError ? <div className="users-form-error">{formError}</div> : null}

            <footer className="users-modal-footer">
              <button
                className="users-secondary-button"
                type="button"
                disabled={inviteUser.isPending}
                onClick={closeModal}
              >
                {t('users.modal.cancel')}
              </button>
              <button className="users-primary-button" type="submit" disabled={inviteUser.isPending}>
                {inviteUser.isPending ? t('users.modal.creating') : t('users.modal.createBtn')}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
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
      <PageHeader title={t('dashboard.pageTitle')} actions={<InviteUserControl />} />

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
