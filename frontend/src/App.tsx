import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { LoginPage } from './pages/login/LoginPage'
import { isAuthenticated } from './services/auth'

function ProtectedDashboard() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return <DashboardPage />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedDashboard />} />
    </Routes>
  )
}

export default App
