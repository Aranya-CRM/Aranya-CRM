import { type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Spin } from 'antd'
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

interface ManifestProtectedRouteProps {
  routeId: string
  children: ReactNode
}

function ManifestProtectedRoute({ routeId, children }: ManifestProtectedRouteProps) {
  const { loading, authenticated, canRoute } = useAuth()

  // 初始 profile + manifest 还没回来 — 显示全屏 Spin，避免闪一下登录页再跳回。
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Spin size="large" tip="Loading..." />
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  if (!canRoute(routeId)) {
    // 当前 capability 清单没有返回这个 route — 退到 Dashboard。
    return <Navigate to="/dashboard" replace />
  }

  return <AppLayout>{children}</AppLayout>
}

function UsersPlaceholderPage() {
  return (
    <>
      <h2 className="page-title">用户管理</h2>
      <div className="page-subtitle">User Management</div>
      <div className="desc-zh">用户管理页面将在后续步骤实现。</div>
      <div className="desc-en">This page will be implemented in a later step.</div>
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ManifestProtectedRoute routeId="dashboard">
            <DashboardPage />
          </ManifestProtectedRoute>
        }
      />

      {/* Clients */}
      <Route
        path="/clients"
        element={
          <ManifestProtectedRoute routeId="clients.list">
            <ClientListPage />
          </ManifestProtectedRoute>
        }
      />
      <Route
        path="/clients/new"
        element={
          <ManifestProtectedRoute routeId="clients.create">
            <ClientFormPage />
          </ManifestProtectedRoute>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <ManifestProtectedRoute routeId="clients.detail">
            <ClientDetailPage />
          </ManifestProtectedRoute>
        }
      />
      <Route
        path="/clients/:id/edit"
        element={
          <ManifestProtectedRoute routeId="clients.edit">
            <ClientFormPage />
          </ManifestProtectedRoute>
        }
      />

      {/* Cases */}
      <Route
        path="/cases"
        element={
          <ManifestProtectedRoute routeId="cases.list">
            <CaseListPage />
          </ManifestProtectedRoute>
        }
      />
      <Route
        path="/cases/new"
        element={
          <ManifestProtectedRoute routeId="cases.create">
            <CaseFormPage />
          </ManifestProtectedRoute>
        }
      />
      <Route
        path="/cases/:id"
        element={
          <ManifestProtectedRoute routeId="cases.detail">
            <CaseDetailPage />
          </ManifestProtectedRoute>
        }
      />

      {/* Reports */}
      <Route
        path="/reports"
        element={
          <ManifestProtectedRoute routeId="reports.list">
            <ReportListPage />
          </ManifestProtectedRoute>
        }
      />
      <Route
        path="/reports/new"
        element={
          <ManifestProtectedRoute routeId="reports.create">
            <ReportFormPage />
          </ManifestProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ManifestProtectedRoute routeId="users.list">
            <UsersPlaceholderPage />
          </ManifestProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
