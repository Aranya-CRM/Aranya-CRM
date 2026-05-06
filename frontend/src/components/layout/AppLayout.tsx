import { type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { NAVIGATION_ITEMS, LogoutIcon, type NavigationItem } from '../../app/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useAccess } from '../../shared/auth'
import './AppLayout.css'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const { canRoute } = useAccess()
  const location = useLocation()
  const navigate = useNavigate()

  const visibleItems = NAVIGATION_ITEMS.filter((item) => canRoute(item.routeId))

  function handleNavClick(item: NavigationItem) {
    navigate(item.path)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <h1 className="brand-title">阿兰若个案管理系统</h1>
          <div className="brand-subtitle">Aranya CRM</div>
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
                <span className="nav-label">
                  <span className="nav-zh">{item.zhLabel}</span>
                  <span className="nav-en">{item.enLabel}</span>
                </span>
              </a>
            )
          })}
        </nav>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">阿兰若个案管理系统</div>
            <div className="topbar-subtitle">Aranya CRM Admin System</div>
          </div>
          <div className="topbar-right">
            <div className="topbar-user">
              <span className="topbar-user-name">
                {user?.fullName ?? 'User'}
              </span>
            </div>
            <button className="logout-btn" type="button" onClick={logout} title="登出 / Logout">
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
