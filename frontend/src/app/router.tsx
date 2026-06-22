import type { ReactNode } from 'react'
import { approvalRoutes } from '../features/approvals/routes'
import { authRoutes } from '../features/auth/routes'
import { caseRoutes } from '../features/cases/routes'
import { clientRoutes } from '../features/clients/routes'
import { dashboardRoutes } from '../features/dashboard/routes'
import { profileRoutes } from '../features/profile/routes'
import { reportRoutes } from '../features/reports/routes'
import { taskRoutes } from '../features/tasks/routes'
import { userRoutes } from '../features/users/routes'

export interface AppRouteConfig {
  path: string
  routeId?: string
  element: ReactNode
}

export const PUBLIC_ROUTES: AppRouteConfig[] = [
  ...authRoutes,
]

export const PROTECTED_ROUTES: AppRouteConfig[] = [
  ...dashboardRoutes,
  ...clientRoutes,
  ...caseRoutes,
  ...reportRoutes,
  ...approvalRoutes,
  ...taskRoutes,
  ...userRoutes,
  ...profileRoutes,
]
