import { useEffect, useMemo, useState } from 'react'
import { fetchDashboardData } from '../../services/dashboard.api'
import type { ActiveCase, DashboardData } from '../../types/dashboard'
import './dashboard.css'

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

function StatusBadge({ status }: { status: ActiveCase['status'] }) {
  return (
    <span className="status-badge">
      <span className="cell-zh">{status.zh}</span>
      <span className="cell-en">{status.en}</span>
    </span>
  )
}

function formatHonorific(name: string): string {
  return name.replace(/^Monk\s+/i, 'Bhante ')
}

export function DashboardPage() {
  const { isSocialWorker } = useAuth()
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState<DashboardData>()
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    let active = true

    async function loadDashboardData() {
      try {
        const data = await fetchDashboardData()
        if (active) {
          setDashboardData(data)
          setErrorMessage(undefined)
        }
      } catch {
        if (active) {
          setErrorMessage('仪表盘数据加载失败，请稍后重试。 / Failed to load dashboard data.')
        }
      }
    }

    void loadDashboardData()

    return () => {
      active = false
    }
  }, [])

  const activeCases = useMemo(() => dashboardData?.activeCases ?? [], [dashboardData])
  const attentionCases = useMemo(() => dashboardData?.attentionCases ?? [], [dashboardData])
  const upcomingAppointments = useMemo(
    () => dashboardData?.upcomingAppointments ?? [],
    [dashboardData],
  )

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <h1 className="brand-title">阿兰若个案管理系统</h1>
          <div className="brand-subtitle">Aranya CRM</div>
        </div>

        <nav className="nav" aria-label="Sidebar Navigation">
          <a className="nav-item active" href="#" aria-current="page" onClick={(e) => e.preventDefault()}>
            <span className="nav-icon" aria-hidden="true">
              <DashboardIcon />
            </span>
            <span className="nav-label">
              <span className="nav-zh">工作台</span>
              <span className="nav-en">Dashboard</span>
            </span>
          </a>

          <a className="nav-item" href="#" onClick={(e) => e.preventDefault()}>
            <span className="nav-icon" aria-hidden="true">
              <ClientsIcon />
            </span>
            <span className="nav-label">
              <span className="nav-zh">僧人档案</span>
              <span className="nav-en">Clients</span>
            </span>
          </a>

          <a className="nav-item" href="#" onClick={(e) => e.preventDefault()}>
            <span className="nav-icon" aria-hidden="true">
              <CasesIcon />
            </span>
            <span className="nav-label">
              <span className="nav-zh">个案管理</span>
              <span className="nav-en">Cases</span>
            </span>
          </a>
        </nav>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">阿兰若个案管理系统</div>
            <div className="topbar-subtitle">Aranya CRM Admin System</div>
          </div>
          <div className="topbar-user">
            <div>用户: Admin</div>
            <div>User: Admin</div>
          </div>
        </header>

        <main className="content">
          <h2 className="page-title">工作台</h2>
          <div className="page-subtitle">Dashboard</div>
          <div className="desc-zh">欢迎回来。这是您的个案管理工作概览。</div>
          <div className="desc-en">Welcome back. Here's an overview of your case management activities.</div>

          {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

          <section className="card" aria-label="Quick Actions">
            <div className="card-body">
              <div className="card-title">快速操作</div>
              <div className="card-subtitle">Quick Actions</div>
              <div className="quick-actions quick-actions-spacing">
                <button className="quick-btn" type="button">
                  <span className="quick-icon">＋</span>
                  <span className="quick-label">
                    <span className="zh">新增僧人</span>
                    <span className="en">New Client</span>
                  </span>
                </button>
                <button className="quick-btn" type="button">
                  <span className="quick-icon">＋</span>
                  <span className="quick-label">
                    <span className="zh">新建个案</span>
                    <span className="en">New Case</span>
                  </span>
                </button>
                <button className="quick-btn" type="button">
                  <span className="quick-icon">📄</span>
                  <span className="quick-label">
                    <span className="zh">查看我的个案</span>
                    <span className="en">View My Cases</span>
                  </span>
                </button>
              </div>
            </div>
          </section>

          <section className="card" aria-label="My Active Cases">
            <div className="card-header">
              <div className="card-title">我的活跃个案</div>
              <div className="card-subtitle">My Active Cases</div>
            </div>
            <div className="table-wrap">
              <table>
                <colgroup>
                  <col className="col-title" />
                  <col className="col-client" />
                  <col className="col-status" />
                  <col className="col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th><span className="th-zh">标题</span><span className="th-en">Title</span></th>
                    <th><span className="th-zh">服务对象</span><span className="th-en">Client</span></th>
                    <th><span className="th-zh">状态</span><span className="th-en">Status</span></th>
                    <th className="action-cell-left"><span className="th-zh">操作</span><span className="th-en">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {activeCases.map((item) => (
                    <tr key={item.id}>
                      <td><span className="cell-zh">{item.title.zh}</span><span className="cell-en">{item.title.en}</span></td>
                      <td><span className="cell-zh">{item.client.zh}</span><span className="cell-en">{formatHonorific(item.client.en)}</span></td>
                      <td><StatusBadge status={item.status} /></td>
                      <td className="action-cell action-cell-left">
                        <button className="action-link" type="button">
                          <span className="cell-zh">查看</span>
                          <span className="cell-en">View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" aria-label="Cases Needing Attention">
            <div className="card-header">
              <div className="card-title">需要关注的个案</div>
              <div className="card-subtitle">Cases Needing Attention</div>
            </div>
            <div className="table-wrap">
              <table>
                <colgroup>
                  <col className="col-client-2" />
                  <col className="col-reason" />
                  <col className="col-actions-2" />
                </colgroup>
                <thead>
                  <tr>
                    <th><span className="th-zh">服务对象</span><span className="th-en">Client</span></th>
                    <th><span className="th-zh">原因</span><span className="th-en">Reason</span></th>
                    <th className="action-cell-left"><span className="th-zh">操作</span><span className="th-en">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {attentionCases.map((item) => (
                    <tr key={item.id}>
                      <td><span className="cell-zh">{item.client.zh}</span><span className="cell-en">{formatHonorific(item.client.en)}</span></td>
                      <td><span className="cell-zh">{item.reason.zh}</span><span className="cell-en">{item.reason.en}</span></td>
                      <td className="action-cell-left">
                        <button className="action-link" type="button">
                          <span className="cell-zh">查看</span>
                          <span className="cell-en">View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" aria-label="Upcoming Appointments">
            <div className="card-header">
              <div className="card-title">即将到来的预约</div>
              <div className="card-subtitle">Upcoming Appointments</div>
            </div>
            <div className="table-wrap">
              <table>
                <colgroup>
                  <col className="col-date" />
                  <col className="col-time" />
                  <col className="col-client-3" />
                  <col className="col-purpose" />
                </colgroup>
                <thead>
                  <tr>
                    <th><span className="th-zh">日期</span><span className="th-en">Date</span></th>
                    <th><span className="th-zh">时间</span><span className="th-en">Time</span></th>
                    <th><span className="th-zh">服务对象</span><span className="th-en">Client</span></th>
                    <th><span className="th-zh">目的</span><span className="th-en">Purpose</span></th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingAppointments.map((item) => {
                    const startsAt = new Date(item.startsAt)
                    const dateText = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, '0')}-${String(startsAt.getDate()).padStart(2, '0')}`
                    const hour = startsAt.getHours()
                    const minutes = String(startsAt.getMinutes()).padStart(2, '0')
                    const period = hour >= 12 ? 'PM' : 'AM'
                    const formattedHour = hour % 12 || 12
                    return (
                      <tr key={item.id}>
                        <td><span className="cell-zh">{dateText}</span></td>
                        <td><span className="cell-zh">{`${formattedHour}:${minutes} ${period}`}</span></td>
                        <td><span className="cell-zh">{item.client.zh}</span><span className="cell-en">{formatHonorific(item.client.en)}</span></td>
                        <td><span className="cell-zh">{item.purpose.zh}</span><span className="cell-en">{item.purpose.en}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </section>
    </div>
  )
}


