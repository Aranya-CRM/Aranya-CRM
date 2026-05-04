import { type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../services/auth'
import { DevRoleSwitcher } from './DevRoleSwitcher'
import './AppLayout.css'

/* ── SVG Icons ── */

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" />
      <rect x="13.5" y="3.5" width="7" height="7" />
      <rect x="3.5" y="13.5" width="7" height="7" />
      <rect x="13.5" y="13.5" width="7" height="7" />
    </svg>
  )
}

function ClientsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="9" r="3" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M3 18c0-3.2 2.5-5.2 6-5.2s6 2 6 5.2" />
      <path d="M13 18c0-2.4 1.8-3.9 4.3-3.9 2.5 0 3.7 1.2 3.7 3.9" />
    </svg>
  )
}

function CasesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 6.5h6l2 2H20.5v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
      <path d="M3.5 9h17" />
    </svg>
  )
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 19c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 19c0-2.5 1.8-4 4-4s2.5 1.5 2.5 4" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

/* ── Navigation definition ── */

interface NavItem {
  path: string
  zhLabel: string
  enLabel: string
  icon: ReactNode
  /** Roles allowed to see this nav item. Omit to allow everyone. */
  roles?: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    zhLabel: '工作台',
    enLabel: 'Dashboard',
    icon: <DashboardIcon />,
  },
  {
    path: '/clients',
    zhLabel: '僧人档案',
    enLabel: 'Clients',
    icon: <ClientsIcon />,
  },
  {
    path: '/cases',
    zhLabel: '个案管理',
    enLabel: 'Cases',
    icon: <CasesIcon />,
    roles: ['SOCIAL_WORKER', 'MANAGER'],
  },
  {
    path: '/reports',
    zhLabel: '探访报告',
    enLabel: 'Reports',
    icon: <ReportsIcon />,
  },
  {
    path: '/users',
    zhLabel: '用户管理',
    enLabel: 'Users',
    icon: <UsersIcon />,
    roles: ['MANAGER'],
  },
]

/* ── Role badge helpers ── */

const ROLE_BADGE_LABEL: Record<UserRole, string> = {
  VOLUNTEER: 'Volunteer',
  SOCIAL_WORKER: 'Social Worker',
  MANAGER: 'Manager',
}

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  VOLUNTEER: 'role-volunteer',
  SOCIAL_WORKER: 'role-social_worker',
  MANAGER: 'role-manager',
}

/* ── Layout Component ── */

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, primaryRole, hasAnyRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || hasAnyRole(...item.roles),
  )

  function handleNavClick(item: NavItem) {
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
                onClick={(e) => {
                  e.preventDefault()
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
            <DevRoleSwitcher />
            <div className="topbar-user">
              <span className="topbar-user-name">
                {user.fullName ?? 'User'}
              </span>
              {primaryRole ? (
                <span
                  className={`topbar-role-badge ${ROLE_BADGE_CLASS[primaryRole]}`}
                >
                  {ROLE_BADGE_LABEL[primaryRole]}
                </span>
              ) : null}
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
