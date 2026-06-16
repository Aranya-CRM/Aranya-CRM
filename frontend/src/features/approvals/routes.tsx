import { NAVIGATION_BY_ID } from '../../app/navigation'
import type { AppRouteConfig } from '../../app/router'
import { ApprovalListPage } from './pages/ApprovalListPage'

export const approvalRoutes: AppRouteConfig[] = [
  {
    path: NAVIGATION_BY_ID.approvals.path,
    routeId: NAVIGATION_BY_ID.approvals.routeId,
    element: <ApprovalListPage />,
  },
]
