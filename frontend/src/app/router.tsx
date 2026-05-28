import type { ReactNode } from 'react'
import { authRoutes } from '../features/auth/routes'
import { caseRoutes } from '../features/cases/routes'
import { clientRoutes } from '../features/clients/routes'
import { dashboardRoutes } from '../features/dashboard/routes'
import { reportRoutes } from '../features/reports/routes'

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
]
