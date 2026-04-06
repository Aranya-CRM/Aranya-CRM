import { dashboardMockData } from '../mocks/dashboard.mock'
import type {
  DashboardApiResponse,
  DashboardData,
  UpcomingAppointment,
} from '../types/dashboard'
import { http } from './http'

const UPCOMING_MAX_ITEMS = 5

function normalizeUpcomingAppointments(
  appointments: UpcomingAppointment[],
): UpcomingAppointment[] {
  return appointments
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, UPCOMING_MAX_ITEMS)
}

function normalizeDashboardData(data: DashboardApiResponse): DashboardData {
  return {
    activeCases: data.activeCases,
    attentionCases: data.attentionCases,
    upcomingAppointments: normalizeUpcomingAppointments(data.upcomingAppointments),
  }
}

function getDataMode(): 'mock' | 'api' | 'auto' {
  const mode = (import.meta.env.VITE_DASHBOARD_DATA_MODE ?? 'auto').toLowerCase()
  if (mode === 'mock' || mode === 'api') {
    return mode
  }
  return 'auto'
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const mode = getDataMode()

  if (mode === 'mock') {
    return normalizeDashboardData(dashboardMockData)
  }

  try {
    const response = await http.get<DashboardApiResponse>('/dashboard')
    return normalizeDashboardData(response.data)
  } catch (error) {
    if (mode === 'auto') {
      return normalizeDashboardData(dashboardMockData)
    }

    throw error
  }
}

