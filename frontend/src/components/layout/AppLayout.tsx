import { type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
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
  swOnly?: boolean       // hidden for volunteers
  disabledForVolunteer?: boolean  // visible but greyed out
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
    disabledForVolunteer: true,
  },
  {
    path: '/reports',
    zhLabel: '探访报告',
    enLabel: 'Reports',
    icon: <ReportsIcon />,
  },
]

/* ── Layout Component ── */

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const role = 'MEMBER'
  const isVolunteer = false
  const roleBadge = 'Member'

  function handleNavClick(item: NavItem) {
    if (isVolunteer && item.disabledForVolunteer) return
    if (item.swOnly && isVolunteer) return
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
          {NAV_ITEMS.map((item) => {
            if (item.swOnly && isVolunteer) return null

            const isActive = location.pathname.startsWith(item.path)
            const isDisabled = isVolunteer && item.disabledForVolunteer

            return (
              <a
                key={item.path}
                className={
                  'nav-item' +
                  (isActive ? ' active' : '') +
                  (isDisabled ? ' disabled' : '')
                }
                href={item.path}
                aria-current={isActive ? 'page' : undefined}
                aria-disabled={isDisabled || undefined}
                title={isDisabled ? '权限不足 / Insufficient permissions' : undefined}
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
            <div className="topbar-user">
              <span className="topbar-user-name">
                {user.fullName ?? 'User'}
              </span>
              <span className="topbar-role-badge">
                {roleBadge}
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
