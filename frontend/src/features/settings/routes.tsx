import { Navigate } from 'react-router-dom'
import type { AppRouteConfig } from '../../app/router'
import { SETTINGS_PATH, SETTINGS_ROUTE_ID } from './constants'
import { DEFAULT_SECTION_ID } from './sections'
import { SettingsLayout } from './pages/SettingsLayout'

export { SETTINGS_PATH, SETTINGS_ROUTE_ID } from './constants'

export const settingsRoutes: AppRouteConfig[] = [
  {
    path: SETTINGS_PATH,
    routeId: SETTINGS_ROUTE_ID,
    element: <Navigate to={`${SETTINGS_PATH}/${DEFAULT_SECTION_ID}`} replace />,
  },
  {
    path: `${SETTINGS_PATH}/:section`,
    routeId: SETTINGS_ROUTE_ID,
    element: <SettingsLayout />,
  },
]
