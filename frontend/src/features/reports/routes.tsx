import { NAVIGATION_BY_ID } from '../../app/navigation'
import type { AppRouteConfig } from '../../app/router'
import { ReportDetailPage } from './pages/ReportDetailPage'
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
  {
    path: '/reports/:id',
    routeId: 'reports.create',
    element: <ReportDetailPage />,
  },
  {
    path: '/reports/:id/edit',
    routeId: 'reports.create',
    element: <ReportFormPage />,
  },
]
