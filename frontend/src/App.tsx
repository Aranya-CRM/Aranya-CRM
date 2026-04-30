import { type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { useAuth } from './contexts/AuthContext'
import { CaseDetailPage } from './pages/cases/CaseDetailPage'
import { CaseFormPage } from './pages/cases/CaseFormPage'
import { CaseListPage } from './pages/cases/CaseListPage'
import { ClientDetailPage } from './pages/clients/ClientDetailPage'
import { ClientFormPage } from './pages/clients/ClientFormPage'
import { ClientListPage } from './pages/clients/ClientListPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { LoginPage } from './pages/login/LoginPage'
import { ReportFormPage } from './pages/reports/ReportFormPage'
import { ReportListPage } from './pages/reports/ReportListPage'
import type { UserRole } from './services/auth'

interface RoleProtectedRouteProps {
  /**
   * If provided, only users whose role is in this list can enter the route.
   * Omit to require authentication only.
   */
  allow?: UserRole[]
  children: ReactNode
}

function RoleProtectedRoute({ allow, children }: RoleProtectedRouteProps) {
  const { authenticated, hasAnyRole } = useAuth()

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  if (allow && allow.length > 0 && !hasAnyRole(...allow)) {
    // 角色不匹配 — 退到 Dashboard（所有角色都能进）。
    return <Navigate to="/dashboard" replace />
  }

  return <AppLayout>{children}</AppLayout>
}

const ALL_AUTHED: UserRole[] = ['VOLUNTEER', 'SOCIAL_WORKER', 'MANAGER']
const SW_OR_MANAGER: UserRole[] = ['SOCIAL_WORKER', 'MANAGER']

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Dashboard — 所有登录用户 */}
      <Route
        path="/dashboard"
        element={
          <RoleProtectedRoute allow={ALL_AUTHED}>
            <DashboardPage />
          </RoleProtectedRoute>
        }
      />

      {/* Clients — 列表 / 详情：所有角色（Volunteer 看基本视图）；新建 / 编辑：SW + Manager */}
      <Route
        path="/clients"
        element={
          <RoleProtectedRoute allow={ALL_AUTHED}>
            <ClientListPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/clients/new"
        element={
          <RoleProtectedRoute allow={SW_OR_MANAGER}>
            <ClientFormPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <RoleProtectedRoute allow={ALL_AUTHED}>
            <ClientDetailPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/clients/:id/edit"
        element={
          <RoleProtectedRoute allow={SW_OR_MANAGER}>
            <ClientFormPage />
          </RoleProtectedRoute>
        }
      />

      {/* Cases — SW + Manager only（Volunteer 在 sidebar 看不到，直接访问被重定向） */}
      <Route
        path="/cases"
        element={
          <RoleProtectedRoute allow={SW_OR_MANAGER}>
            <CaseListPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/cases/new"
        element={
          <RoleProtectedRoute allow={SW_OR_MANAGER}>
            <CaseFormPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/cases/:id"
        element={
          <RoleProtectedRoute allow={SW_OR_MANAGER}>
            <CaseDetailPage />
          </RoleProtectedRoute>
        }
      />

      {/* Reports — 所有角色 */}
      <Route
        path="/reports"
        element={
          <RoleProtectedRoute allow={ALL_AUTHED}>
            <ReportListPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/reports/new"
        element={
          <RoleProtectedRoute allow={ALL_AUTHED}>
            <ReportFormPage />
          </RoleProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
