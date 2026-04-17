import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AuthProvider } from './contexts/AuthContext'
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
import { isAuthenticated } from './services/auth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return (
    <AuthProvider>
      <AppLayout>{children}</AppLayout>
    </AuthProvider>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      {/* Clients */}
      <Route path="/clients" element={<ProtectedRoute><ClientListPage /></ProtectedRoute>} />
      <Route path="/clients/new" element={<ProtectedRoute><ClientFormPage /></ProtectedRoute>} />
      <Route path="/clients/:id" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
      <Route path="/clients/:id/edit" element={<ProtectedRoute><ClientFormPage /></ProtectedRoute>} />
      {/* Cases */}
      <Route path="/cases" element={<ProtectedRoute><CaseListPage /></ProtectedRoute>} />
      <Route path="/cases/new" element={<ProtectedRoute><CaseFormPage /></ProtectedRoute>} />
      <Route path="/cases/:id" element={<ProtectedRoute><CaseDetailPage /></ProtectedRoute>} />
      {/* Reports */}
      <Route path="/reports" element={<ProtectedRoute><ReportListPage /></ProtectedRoute>} />
      <Route path="/reports/new" element={<ProtectedRoute><ReportFormPage /></ProtectedRoute>} />
    </Routes>
  )
}

export default App
