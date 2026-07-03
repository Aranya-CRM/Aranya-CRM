import type { ReactNode } from 'react'

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" />
      <rect x="13.5" y="3.5" width="7" height="7" />
      <rect x="3.5" y="13.5" width="7" height="7" />
      <rect x="13.5" y="13.5" width="7" height="7" />
    </svg>
  )
}

function ClientsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="9" r="3" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M3 18c0-3.2 2.5-5.2 6-5.2s6 2 6 5.2" />
      <path d="M13 18c0-2.4 1.8-3.9 4.3-3.9 2.5 0 3.7 1.2 3.7 3.9" />
    </svg>
  )
}

function CasesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 6.5h6l2 2H20.5v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
      <path d="M3.5 9h17" />
    </svg>
  )
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function TasksIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6l1 1 2-2" />
      <path d="M3 12l1 1 2-2" />
      <path d="M3 18l1 1 2-2" />
    </svg>
  )
}

function DriveImportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 3h8l4 8-4 8H8l-4-8z" />
      <path d="M8 11h8" />
      <path d="M12 11v6" />
    </svg>
  )
}

export function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export interface NavigationItem {
  id: string
  routeId: string
  path: string
  labelKey: string
  icon: ReactNode
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    routeId: 'route:dashboard',
    path: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: <DashboardIcon />,
  },
  {
    id: 'clients',
    routeId: 'route:clients',
    path: '/clients',
    labelKey: 'nav.clients',
    icon: <ClientsIcon />,
  },
  {
    id: 'cases',
    routeId: 'route:cases',
    path: '/cases',
    labelKey: 'nav.cases',
    icon: <CasesIcon />,
  },
  {
    id: 'tasks',
    routeId: 'route:tasks',
    path: '/tasks',
    labelKey: 'nav.tasks',
    icon: <TasksIcon />,
  },
  {
    id: 'reports',
    routeId: 'route:reports',
    path: '/reports',
    labelKey: 'nav.reports',
    icon: <ReportsIcon />,
  },
  {
    id: 'driveImport',
    routeId: 'cases:documents.import',
    path: '/admin/drive-import',
    labelKey: 'nav.driveImport',
    icon: <DriveImportIcon />,
  },
]

export const NAVIGATION_BY_ID = Object.fromEntries(
  NAVIGATION_ITEMS.map((item) => [item.id, item]),
) as Record<string, NavigationItem>
