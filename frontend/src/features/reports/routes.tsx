import { NAVIGATION_BY_ID } from '../../app/navigation'
import type { AppRouteConfig } from '../../app/router'
import { ReportFormPage } from './pages/ReportFormPage'
import { ReportListPage } from './pages/ReportListPage'

export const reportRoutes: AppRouteConfig[] = [
  {
    path: NAVIGATION_BY_ID.reports.path,
    routeId: NAVIGATION_BY_ID.reports.routeId,
    element: <ReportListPage />,
  },
  {
    path: '/reports/new',
    routeId: 'reports.create',
    element: <ReportFormPage />,
  },
]
