import type { AppRouteConfig } from '../../app/router'
import { SettingsPage } from './pages/SettingsPage'

export const SETTINGS_ROUTE_ID = 'route:settings'
export const SETTINGS_PATH = '/settings'

export const settingsRoutes: AppRouteConfig[] = [
  {
    path: SETTINGS_PATH,
    routeId: SETTINGS_ROUTE_ID,
    element: <SettingsPage />,
  },
]
