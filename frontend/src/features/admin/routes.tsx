import { Navigate } from 'react-router-dom'
import type { AppRouteConfig } from '../../app/router'
import { AccountManagementSection } from './components/AccountManagementSection'
import { DriveImportPage } from './pages/DriveImportPage'

export const adminRoutes: AppRouteConfig[] = [
  {
    path: '/admin',
    routeId: 'admin:console.access',
    element: <Navigate to="/admin/accounts" replace />,
  },
  {
    path: '/admin/accounts',
    routeId: 'route:users',
    element: <AccountManagementSection />,
  },
  {
    path: '/admin/drive-import',
    routeId: 'cases:documents.import',
    element: <DriveImportPage />,
  },
]
