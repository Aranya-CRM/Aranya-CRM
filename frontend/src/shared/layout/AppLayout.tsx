import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { NAVIGATION_ITEMS, LogoutIcon, type NavigationItem } from '../../app/navigation'
import { useAuth } from '../../contexts/AuthContext'
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

  function handleNavClick(item: NavigationItem) {
    navigate(item.path)
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
              </a>
            )
          })}
        </nav>

        <button
          type="button"
          className={'sidebar-profile' + (location.pathname.startsWith('/profile') ? ' active' : '')}
          onClick={() => navigate('/profile')}
          aria-current={location.pathname.startsWith('/profile') ? 'page' : undefined}
        >
          <span className="sidebar-profile-avatar" aria-hidden="true">
            {profileInitials(user?.fullName)}
          </span>
          <span className="sidebar-profile-text">
            <span className="sidebar-profile-name">{user?.fullName ?? 'User'}</span>
            <span className="sidebar-profile-link">{t('nav.profile')}</span>
          </span>
        </button>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">{t('layout.topbarTitle')}</div>
            <div className="topbar-subtitle">{t('layout.topbarSubtitle')}</div>
          </div>
          <div className="topbar-right">
            <LanguageSwitcher />
            <div className="topbar-user">
              <span className="topbar-user-name">
                {user?.fullName ?? 'User'}
              </span>
            </div>
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
