import type { AppRouteConfig } from '../../app/router'
import { UsersPage } from './pages/UsersPage'

// 用户管理导航入口已隐藏(见 navigation.tsx),但路由仍保留可直接访问 /users。
// 因此这里硬编码 path/routeId,不再依赖 NAVIGATION_BY_ID 的 users 项。
export const userRoutes: AppRouteConfig[] = [
  {
    path: '/users',
    routeId: 'route:users',
    element: <UsersPage />,
  },
]
