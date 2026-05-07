import { useEffect, useMemo, useState } from 'react'
import { ErrorBanner, PageHeader, SectionCard, TableShell } from '../../../shared/ui'
import { fetchDashboardData } from '../api/dashboard.api'
import type { ActiveCase, DashboardData } from '../types'
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
  return name.replace(/^Monk\s+/i, 'Bhante ')
}

export function DashboardPage() {
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
    <>
      <PageHeader
        titleZh="工作台"
        titleEn="Dashboard"
        descriptionZh="欢迎回来。这是您的个案管理工作概览。"
        descriptionEn="Welcome back. Here's an overview of your case management activities."
      />

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <SectionCard titleZh="快速操作" titleEn="Quick Actions" ariaLabel="Quick Actions" bodyPadding>
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
      </SectionCard>

      <SectionCard titleZh="我的活跃个案" titleEn="My Active Cases" ariaLabel="My Active Cases">
        <TableShell>
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
        </TableShell>
      </SectionCard>

      <SectionCard titleZh="需要关注的个案" titleEn="Cases Needing Attention" ariaLabel="Cases Needing Attention">
        <TableShell>
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
        </TableShell>
      </SectionCard>

      <SectionCard titleZh="即将到来的预约" titleEn="Upcoming Appointments" ariaLabel="Upcoming Appointments">
        <TableShell>
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
        </TableShell>
      </SectionCard>
    </>
  )
}
