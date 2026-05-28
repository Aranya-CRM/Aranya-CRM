import { fetchDashboardData } from '../../dashboard/api/dashboard.api'
import type { DashboardItem } from '../../dashboard/types'

export async function fetchAssignedTasks(): Promise<DashboardItem[]> {
  const dashboard = await fetchDashboardData()
  return dashboard.sections.find((section) => section.id === 'volunteer.recent_tasks')?.items ?? []
}
