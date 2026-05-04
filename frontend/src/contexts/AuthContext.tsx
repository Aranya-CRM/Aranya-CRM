import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  clearSession,
  getCurrentUser,
  isAuthenticated,
  type UserRole,
} from '../services/auth'

interface AuthContextValue {
  authenticated: boolean
  user: { email: string | null; fullName: string | null; roles: UserRole[] }
  /** roles[0] — used to drive "primary" role-conditional UI */
  primaryRole: UserRole | null
  isVolunteer: boolean
  isSocialWorker: boolean
  isManager: boolean
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (...roles: UserRole[]) => boolean
  /**
   * Dev-only role override. Available only when `import.meta.env.DEV` is true,
   * `undefined` in production builds. Passing `null` clears the override.
   */
  setRoleOverride?: (role: UserRole | null) => void
  roleOverride: UserRole | null
  refreshAuth: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [roleOverride, setRoleOverride] = useState<UserRole | null>(null)
  const [sessionVersion, setSessionVersion] = useState(0)

  const value = useMemo<AuthContextValue>(() => {
    const authenticated = isAuthenticated()
    const stored = getCurrentUser()
    const realRoles = stored.roles
    const effectiveRoles: UserRole[] = roleOverride ? [roleOverride] : realRoles

    const has = (role: UserRole) => effectiveRoles.includes(role)
    const hasAny = (...roles: UserRole[]) => roles.some((r) => effectiveRoles.includes(r))

    return {
      authenticated,
      user: {
        email: stored.email,
        fullName: stored.fullName,
        roles: effectiveRoles,
      },
      primaryRole: effectiveRoles[0] ?? null,
      isVolunteer: has('VOLUNTEER'),
      isSocialWorker: has('SOCIAL_WORKER'),
      isManager: has('MANAGER'),
      hasRole: has,
      hasAnyRole: hasAny,
      roleOverride,
      setRoleOverride: import.meta.env.DEV ? setRoleOverride : undefined,
      refreshAuth: () => setSessionVersion((version) => version + 1),
      logout: () => {
        clearSession()
        window.location.href = '/login'
      },
    }
  }, [roleOverride, sessionVersion])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
