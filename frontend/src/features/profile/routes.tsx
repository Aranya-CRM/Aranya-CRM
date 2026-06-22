import type { AppRouteConfig } from '../../app/router'
import { ProfilePage } from './pages/ProfilePage'

/** 个人 Profile,所有已登录用户可访问(ManifestProtectedRoute 对该 routeId 放行)。 */
export const PROFILE_ROUTE_ID = 'route:profile'
export const PROFILE_PATH = '/profile'

export const profileRoutes: AppRouteConfig[] = [
  {
    path: PROFILE_PATH,
    routeId: PROFILE_ROUTE_ID,
    element: <ProfilePage />,
  },
]
