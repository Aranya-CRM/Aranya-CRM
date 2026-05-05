import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearSession,
  getAccessToken,
  type UserRole,
} from '../services/auth'
import { getCurrentUser, type MeResponse } from '../services/user.api'

interface AuthContextValue {
  /** True while the initial /me fetch is in flight. Routes should render a loading state until this is false. */
  loading: boolean
  authenticated: boolean
  user: MeResponse | null
  /** roles[0] — used to drive "primary" role-conditional UI (badge color, etc.) */
  primaryRole: UserRole | null
  isVolunteer: boolean
  isSocialWorker: boolean
  isManager: boolean
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (...roles: UserRole[]) => boolean
  /** Re-fetch /me. Call this after a successful login flow completes. */
  refreshUser: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<MeResponse | null>(null)

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null)
      return
    }
    try {
      const me = await getCurrentUser()
      setUser(me)
    } catch {
      // Token invalid / expired / network failure — drop session so the user
      // gets bounced to the login page on the next protected-route render.
      clearSession()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    void refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const value = useMemo<AuthContextValue>(() => {
    const roles = user?.roles ?? []
    const has = (role: UserRole) => roles.includes(role)
    const hasAny = (...rs: UserRole[]) => rs.some((r) => roles.includes(r))

    return {
      loading,
      authenticated: user !== null,
      user,
      primaryRole: roles[0] ?? null,
      isVolunteer: has('VOLUNTEER'),
      isSocialWorker: has('SOCIAL_WORKER'),
      isManager: has('MANAGER'),
      hasRole: has,
      hasAnyRole: hasAny,
      refreshUser,
      logout: () => {
        clearSession()
        setUser(null)
        window.location.href = '/login'
      },
    }
  }, [loading, user, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
