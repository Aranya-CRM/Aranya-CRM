import { NAVIGATION_BY_ID } from '../../app/navigation'
import type { AppRouteConfig } from '../../app/router'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { ClientFormPage } from './pages/ClientFormPage'
import { ClientListPage } from './pages/ClientListPage'

export const clientRoutes: AppRouteConfig[] = [
  {
    path: NAVIGATION_BY_ID.clients.path,
    routeId: NAVIGATION_BY_ID.clients.routeId,
    element: <ClientListPage />,
  },
  {
    path: '/clients/new',
    routeId: 'clients.create',
    element: <ClientFormPage />,
  },
  {
    path: '/clients/:id',
    routeId: 'clients.detail',
    element: <ClientDetailPage />,
  },
  {
    path: '/clients/:id/edit',
    routeId: 'clients.edit',
    element: <ClientFormPage />,
  },
]
