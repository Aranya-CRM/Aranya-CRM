import { NAVIGATION_BY_ID } from '../../app/navigation'
import type { AppRouteConfig } from '../../app/router'
import { ReportDetailPage } from './pages/ReportDetailPage'
import { ReportFormPage } from './pages/ReportFormPage'
import { TaskDetailPage } from '../tasks/pages/TaskDetailPage'
import { TaskListPage } from '../tasks/pages/TaskListPage'

export const reportRoutes: AppRouteConfig[] = [
  {
    path: NAVIGATION_BY_ID.reports.path,
    routeId: NAVIGATION_BY_ID.reports.routeId,
    element: <TaskListPage />,
  },
  {
    path: '/reports/new',
    routeId: 'reports:create',
    element: <ReportFormPage />,
  },
  {
    path: '/reports/report/:id',
    routeId: 'reports:view',
    element: <ReportDetailPage />,
  },
  {
    path: '/reports/report/:id/edit',
    routeId: 'reports:update',
    element: <ReportFormPage />,
  },
  {
    path: '/reports/:id',
    routeId: NAVIGATION_BY_ID.reports.routeId,
    element: <TaskDetailPage />,
  },
]
