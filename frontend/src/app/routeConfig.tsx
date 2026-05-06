import type { ReactNode } from 'react'
import { CaseDetailPage } from '../pages/cases/CaseDetailPage'
import { CaseFormPage } from '../pages/cases/CaseFormPage'
import { CaseListPage } from '../pages/cases/CaseListPage'
import { ClientDetailPage } from '../pages/clients/ClientDetailPage'
import { ClientFormPage } from '../pages/clients/ClientFormPage'
import { ClientListPage } from '../pages/clients/ClientListPage'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { ReportFormPage } from '../pages/reports/ReportFormPage'
import { ReportListPage } from '../pages/reports/ReportListPage'
import { UsersPlaceholderPage } from '../pages/users/UsersPlaceholderPage'
import { NAVIGATION_BY_ID } from './navigation'

export interface AppRouteConfig {
  path: string
  routeId: string
  element: ReactNode
}

export const APP_ROUTES: AppRouteConfig[] = [
  {
    path: NAVIGATION_BY_ID.dashboard.path,
    routeId: NAVIGATION_BY_ID.dashboard.routeId,
    element: <DashboardPage />,
  },
  {
    path: NAVIGATION_BY_ID.clients.path,
    routeId: NAVIGATION_BY_ID.clients.routeId,
    element: <ClientListPage />,
  },
  { path: '/clients/new', routeId: 'clients.create', element: <ClientFormPage /> },
  { path: '/clients/:id', routeId: 'clients.detail', element: <ClientDetailPage /> },
  { path: '/clients/:id/edit', routeId: 'clients.edit', element: <ClientFormPage /> },
  {
    path: NAVIGATION_BY_ID.cases.path,
    routeId: NAVIGATION_BY_ID.cases.routeId,
    element: <CaseListPage />,
  },
  { path: '/cases/new', routeId: 'cases.create', element: <CaseFormPage /> },
  { path: '/cases/:id', routeId: 'cases.detail', element: <CaseDetailPage /> },
  {
    path: NAVIGATION_BY_ID.reports.path,
    routeId: NAVIGATION_BY_ID.reports.routeId,
    element: <ReportListPage />,
  },
  { path: '/reports/new', routeId: 'reports.create', element: <ReportFormPage /> },
  {
    path: NAVIGATION_BY_ID.users.path,
    routeId: NAVIGATION_BY_ID.users.routeId,
    element: <UsersPlaceholderPage />,
  },
]
