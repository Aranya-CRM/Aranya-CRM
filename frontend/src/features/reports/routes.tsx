import { NAVIGATION_BY_ID } from '../../app/navigation'
import type { AppRouteConfig } from '../../app/router'
import { ReportDetailPage } from './pages/ReportDetailPage'
import { ReportFormPage } from './pages/ReportFormPage'
import { ReportOverviewPage } from './pages/ReportOverviewPage'

export const reportRoutes: AppRouteConfig[] = [
  {
    path: NAVIGATION_BY_ID.reports.path,
    routeId: NAVIGATION_BY_ID.reports.routeId,
    element: <ReportOverviewPage />,
  },
  {
    path: '/reports/new',
    routeId: 'reports:create',
    element: <ReportFormPage />,
  },
  {
    path: '/reports/:id',
    routeId: 'reports:view',
    element: <ReportDetailPage />,
  },
  {
    path: '/reports/:id/edit',
    routeId: 'reports:update',
    element: <ReportFormPage />,
  },
]
