import { NAVIGATION_BY_ID } from '../../app/navigation'
import type { AppRouteConfig } from '../../app/router'
import { DashboardPage } from './pages/DashboardPage'

export const dashboardRoutes: AppRouteConfig[] = [
  {
    path: NAVIGATION_BY_ID.dashboard.path,
    routeId: NAVIGATION_BY_ID.dashboard.routeId,
    element: <DashboardPage />,
  },
]
