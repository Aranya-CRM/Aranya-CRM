import { createContext, useContext, useMemo, type ReactNode } from 'react'
import {
  clearSession,
  getCurrentUser,
  isAuthenticated,
  type UserRole,
} from '../services/auth'

interface AuthContextValue {
  authenticated: boolean
  user: { email: string | null; fullName: string | null; role: UserRole }
  role: UserRole
  isSocialWorker: boolean
  isVolunteer: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => {
    const authenticated = isAuthenticated()
    const user = getCurrentUser()

    return {
      authenticated,
      user,
      role: user.role,
      isSocialWorker: user.role === 'SOCIAL_WORKER',
      isVolunteer: user.role === 'VOLUNTEER',
      logout: () => {
        clearSession()
        window.location.href = '/login'
      },
    }
  }, [])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
