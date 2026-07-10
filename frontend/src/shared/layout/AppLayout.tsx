import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ADMIN_ENTRY_ROUTE_IDS,
  AdminIcon,
  NAVIGATION_ITEMS,
  LogoutIcon,
  type NavigationItem,
} from '../../app/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { countApprovalNavBadges } from '../../features/approvals/approvalNavBadges'
import { usePendingApprovals } from '../../features/approvals/api/approval.api'
import { useAccess } from '../auth'
import { LanguageSwitcher } from '../ui/LanguageSwitcher'
import './AppLayout.css'
import { useIdleLogout } from '../hooks/useIdleLogout'
import { IdleWarningModal } from '../ui/feedback/IdleWarningModal'

interface AppLayoutProps {
  children: ReactNode
}

function profileInitials(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { canRoute, resolve } = useAccess()
  const location = useLocation()
  const navigate = useNavigate()
  const canDecideApprovals = resolve('approvals:decide')
  const { data: pendingApprovals = [] } = usePendingApprovals({ enabled: canDecideApprovals })
  const approvalBadgeCounts = canDecideApprovals
    ? countApprovalNavBadges(pendingApprovals, user?.id)
    : { clients: 0, cases: 0 }

  const TIMEOUT_MS = 180 * 60 * 1000
  const WARNING_MS = 2 * 60 * 1000

  const { isWarning, warningSecondsLeft, stayLoggedIn, logoutNow } = useIdleLogout({
    timeoutMs: TIMEOUT_MS,
    warningMs: WARNING_MS,
    onLogout: () => {
      logout()
      navigate('/login', { replace: true })
    },
  })

  const isVolunteerOnly = resolve('route:tasks')
    && !resolve('route:clients')
    && !resolve('route:cases')
  const visibleItems = NAVIGATION_ITEMS.filter((item) => {
    if (isVolunteerOnly && item.id !== 'tasks') return false
    return resolve(item.routeId) || canRoute(item.routeId)
  })
  const canEnterAdmin = ADMIN_ENTRY_ROUTE_IDS.some((routeId) => resolve(routeId) || canRoute(routeId))
    || resolve('admin:console.access')
    || canRoute('admin:console.access')


  function handleNavClick(item: NavigationItem) {
    navigate(item.path)
  }

  function approvalBadgeCountFor(item: NavigationItem): number {
    if (item.id === 'clients') return approvalBadgeCounts.clients
    if (item.id === 'cases') return approvalBadgeCounts.cases
    return 0
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <h1 className="brand-title">{t('layout.brandTitle')}</h1>
          <div className="brand-subtitle">{t('layout.brandSubtitle')}</div>
        </div>

        <nav className="nav" aria-label="Sidebar Navigation">
          {visibleItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            const approvalBadgeCount = approvalBadgeCountFor(item)

            return (
              <a
                key={item.path}
                className={'nav-item' + (isActive ? ' active' : '')}
                href={item.path}
                aria-current={isActive ? 'page' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  handleNavClick(item)
                }}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="nav-label">{t(item.labelKey)}</span>
                {approvalBadgeCount > 0 ? (
                  <span className="nav-badge" aria-label={`${approvalBadgeCount} pending approvals`}>
                    {approvalBadgeCount}
                  </span>
                ) : null}
              </a>
            )
          })}
        </nav>

        {canEnterAdmin ? (
          <a
            className="sidebar-admin-entry"
            href="/admin"
            onClick={(event) => {
              event.preventDefault()
              navigate('/admin')
            }}
          >
            <span className="nav-icon" aria-hidden="true">
              <AdminIcon />
            </span>
            <span className="nav-label">{t('nav.admin')}</span>
          </a>
        ) : null}

      </aside>

      <section className="main">
        <header className="topbar">
          <div className="topbar-right">
            <LanguageSwitcher />
            <button
              type="button"
              className={'topbar-profile' + (location.pathname.startsWith('/profile') ? ' active' : '')}
              onClick={() => navigate('/profile')}
              aria-current={location.pathname.startsWith('/profile') ? 'page' : undefined}
              title={t('nav.profile')}
            >
              <span className="topbar-profile-avatar" aria-hidden="true">
                {profileInitials(user?.fullName)}
              </span>
              <span className="topbar-profile-name">{user?.fullName ?? 'User'}</span>
            </button>
            <button className="logout-btn" type="button" onClick={logout} title={t('layout.logout')}>
              <LogoutIcon />
            </button>
          </div>
        </header>

        <main className="content">
          {children}
        </main>
      </section>

      <IdleWarningModal
        open={isWarning}
        secondsLeft={warningSecondsLeft}
        totalSeconds={Math.ceil(WARNING_MS / 1000)}
        onStay={stayLoggedIn}
        onLogout={logoutNow}
      />
    </div>
  )
}
