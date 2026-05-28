import { NAVIGATION_BY_ID } from '../../app/navigation'
import type { AppRouteConfig } from '../../app/router'
import { TaskDetailPage } from './pages/TaskDetailPage'
import { TaskListPage } from './pages/TaskListPage'

export const taskRoutes: AppRouteConfig[] = [
  {
    path: NAVIGATION_BY_ID.tasks.path,
    routeId: NAVIGATION_BY_ID.tasks.routeId,
    element: <TaskListPage />,
  },
  {
    path: '/tasks/:id',
    routeId: NAVIGATION_BY_ID.tasks.routeId,
    element: <TaskDetailPage />,
  },
]
