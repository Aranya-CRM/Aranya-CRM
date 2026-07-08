import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { ADMIN_NAV_ITEMS, LogoutIcon, type NavigationItem } from '../../app/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useAccess } from '../auth'
import { getDefaultRoute } from '../auth/defaultRoute'
import { LanguageSwitcher } from '../ui/LanguageSwitcher'
import './AppLayout.css'
import './AdminLayout.css'

interface AdminLayoutProps {
  children: ReactNode
}

function profileInitials(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** 后台管理(Backend Dashboard)独立外壳 —— 自有侧栏(管理分区)+ 返回前台入口,和业务前台分开。 */
export function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation()
  const { user, logout, caps } = useAuth()
  const { canRoute, resolve } = useAccess()
  const location = useLocation()
  const navigate = useNavigate()

  const visibleItems = ADMIN_NAV_ITEMS.filter((item) => resolve(item.routeId) || canRoute(item.routeId))

  function handleNavClick(item: NavigationItem) {
    navigate(item.path)
  }

  return (
    <div className="app app-admin">
      <aside className="sidebar sidebar-admin">
        <div className="brand">
          <h1 className="brand-title">{t('admin.title')}</h1>
          <div className="brand-subtitle">{t('admin.subtitle')}</div>
        </div>

        <button
          type="button"
          className="admin-back-link"
          onClick={() => navigate(getDefaultRoute(caps))}
        >
          <span aria-hidden="true">←</span>
          <span>{t('admin.backToApp')}</span>
        </button>

        <nav className="nav" aria-label="Admin Navigation">
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
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="nav-label">{t(item.labelKey)}</span>
              </a>
            )
          })}
        </nav>
      </aside>

      <section className="main">
        <header className="topbar">
          <div className="topbar-badge">{t('admin.badge')}</div>
          <div className="topbar-right">
            <LanguageSwitcher />
            <button
              type="button"
              className={'topbar-profile' + (location.pathname.startsWith('/profile') ? ' active' : '')}
              onClick={() => navigate('/profile')}
              title={t('nav.profile')}
            >
              <span className="topbar-profile-avatar" aria-hidden="true">{profileInitials(user?.fullName)}</span>
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
    </div>
  )
}
