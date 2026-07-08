import type { AppRouteConfig } from '../../app/router'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { DriveImportPage } from './pages/DriveImportPage'

export const adminRoutes: AppRouteConfig[] = [
  {
    path: '/admin',
    routeId: 'route:users',
    element: <AdminDashboardPage />,
  },
  {
    path: '/admin/drive-import',
    routeId: 'cases:documents.import',
    element: <DriveImportPage />,
  },
]
