import { NAVIGATION_BY_ID } from '../../app/navigation'
import type { AppRouteConfig } from '../../app/router'
import { UsersPlaceholderPage } from './pages/UsersPlaceholderPage'

export const userRoutes: AppRouteConfig[] = [
  {
    path: NAVIGATION_BY_ID.users.path,
    routeId: NAVIGATION_BY_ID.users.routeId,
    element: <UsersPlaceholderPage />,
  },
]
