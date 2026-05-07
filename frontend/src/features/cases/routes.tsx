import { NAVIGATION_BY_ID } from '../../app/navigation'
import type { AppRouteConfig } from '../../app/router'
import { CaseDetailPage } from './pages/CaseDetailPage'
import { CaseFormPage } from './pages/CaseFormPage'
import { CaseListPage } from './pages/CaseListPage'

export const caseRoutes: AppRouteConfig[] = [
  {
    path: NAVIGATION_BY_ID.cases.path,
    routeId: NAVIGATION_BY_ID.cases.routeId,
    element: <CaseListPage />,
  },
  {
    path: '/cases/new',
    routeId: 'cases.create',
    element: <CaseFormPage />,
  },
  {
    path: '/cases/:id',
    routeId: 'cases.detail',
    element: <CaseDetailPage />,
  },
]
