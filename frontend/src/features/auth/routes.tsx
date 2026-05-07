import type { AppRouteConfig } from '../../app/router'
import { LoginPage } from './pages/LoginPage'

export const authRoutes: AppRouteConfig[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
]
