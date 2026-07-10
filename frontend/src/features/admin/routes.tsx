import { Navigate } from 'react-router-dom'
import type { AppRouteConfig } from '../../app/router'
import { AccountManagementSection } from './components/AccountManagementSection'
import { AdminPlaceholderPage } from './pages/AdminPlaceholderPage'
import { DriveImportPage } from './pages/DriveImportPage'

export const adminRoutes: AppRouteConfig[] = [
  {
    path: '/admin',
    routeId: 'route:users',
    element: <Navigate to="/admin/accounts" replace />,
  },
  {
    path: '/admin/accounts',
    routeId: 'route:users',
    element: <AccountManagementSection />,
  },
  {
    path: '/admin/audit',
    routeId: 'route:audit',
    element: <AdminPlaceholderPage titleKey="admin.nav.audit" />,
  },
  {
    path: '/admin/settings',
    routeId: 'route:users',
    element: <AdminPlaceholderPage titleKey="admin.nav.settings" />,
  },
  {
    path: '/admin/drive-import',
    routeId: 'cases:documents.import',
    element: <DriveImportPage />,
  },
]
