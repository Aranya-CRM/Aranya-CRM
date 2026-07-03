import type { AppRouteConfig } from '../../app/router'
import { DriveImportPage } from './pages/DriveImportPage'

export const adminRoutes: AppRouteConfig[] = [
  {
    path: '/admin/drive-import',
    routeId: 'cases:documents.import',
    element: <DriveImportPage />,
  },
]
