import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { fetchDashboardData } from '../../services/dashboard.api'
import type { ActiveCase, DashboardData } from '../../types/dashboard'
import './dashboard.css'

function StatusBadge({ status }: { status: ActiveCase['status'] }) {
  return (
    <span className="status-badge">
      <span className="cell-zh">{status.zh}</span>
      <span className="cell-en">{status.en}</span>
    </span>
  )
}

function formatHonorific(name: string): string {
  return name
    .replace(/^Bhante\s+/i, 'Monastic ')
    .replace(/^Monk\s+/i, 'Monastic ')
}

export function DashboardPage() {
  const { canFeature, canRoute, canWidget } = useAuth()
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
  const canCreateClient = canFeature('clients.create')
  const canCreateCase = canFeature('cases.create')
  const canCreateReport = canFeature('reports.create')
  const canViewCases = canRoute('cases.list')
  const showActiveCases = canWidget('dashboard.activeCases')
  const showUrgentCases = canWidget('dashboard.urgentCases')
  const showUpcomingAppointments = canWidget('dashboard.upcomingAppointments')

  return (
    <>
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
            {canCreateClient ? (
                <button className="quick-btn" type="button" onClick={() => navigate('/clients/new')}>
                  <span className="quick-icon">＋</span>
                  <span className="quick-label">
                    <span className="zh">新增僧人</span>
                    <span className="en">New Client</span>
                  </span>
                </button>
            ) : null}
            {canCreateCase ? (
                <button className="quick-btn" type="button" onClick={() => navigate('/cases/new')}>
                  <span className="quick-icon">＋</span>
                  <span className="quick-label">
                    <span className="zh">新建个案</span>
                    <span className="en">New Case</span>
                  </span>
                </button>
            ) : null}
            {canViewCases ? (
                <button className="quick-btn" type="button" onClick={() => navigate('/cases')}>
                  <span className="quick-icon">📋</span>
                  <span className="quick-label">
                    <span className="zh">查看我的个案</span>
                    <span className="en">View My Cases</span>
                  </span>
                </button>
            ) : null}
            {canCreateReport ? (
              <button className="quick-btn" type="button" onClick={() => navigate('/reports/new')}>
                <span className="quick-icon">📄</span>
                <span className="quick-label">
                  <span className="zh">提交探访报告</span>
                  <span className="en">Submit Report</span>
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {(showActiveCases || showUrgentCases) && (
        <>
          {showActiveCases ? (
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
          ) : null}

          {showUrgentCases ? (
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
                    <th><span className="th-zh">状态</span><span className="th-en">Status</span></th>
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
          ) : null}
        </>
      )}

      {showUpcomingAppointments ? (
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
      ) : null}
    </>
  )
}


