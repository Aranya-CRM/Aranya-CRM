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
  logoutFirebase,
  subscribeFirebaseAuth,
} from '../features/auth/api/auth'
import { getCurrentUser, type MeResponse } from '../features/auth/api/user.api'
import { getUiManifest } from '../features/auth/api/uiManifest.api'
import type { ScopeValue } from '../types/capManifest'
import i18n from '../i18n'

interface AuthContextValue {
  /** True while the Firebase session + backend profile check is in flight. */
  loading: boolean
  authenticated: boolean
  user: MeResponse | null
  /** cap-key → scope-value map. Empty when not loaded or unauthenticated. */
  caps: Record<string, ScopeValue>
  /** Re-fetch profile + UI manifest. Call this after a successful Firebase login. */
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const EMPTY_CAPS: Record<string, ScopeValue> = {}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<MeResponse | null>(null)
  const [caps, setCaps] = useState<Record<string, ScopeValue>>(EMPTY_CAPS)

  const refreshUser = useCallback(async () => {
    try {
      const [me, capsManifest] = await Promise.all([
        getCurrentUser(),
        getUiManifest(),
      ])
      setUser(me)
      setCaps(capsManifest.caps)
      // 账号级语言偏好优先:登录后按用户偏好切换界面语言(跨设备生效)
      if ((me.preferredLanguage === 'zh' || me.preferredLanguage === 'en') && me.preferredLanguage !== i18n.language) {
        void i18n.changeLanguage(me.preferredLanguage)
      }
    } catch {
      setUser(null)
      setCaps(EMPTY_CAPS)
    }
  }, [])

  useEffect(() => {
    return subscribeFirebaseAuth((firebaseUser) => {
      setLoading(true)

      if (!firebaseUser) {
        setUser(null)
        setCaps(EMPTY_CAPS)
        setLoading(false)
        return
      }

      void refreshUser().finally(() => setLoading(false))
    })
  }, [refreshUser])

  const value = useMemo<AuthContextValue>(() => {
    return {
      loading,
      authenticated: user !== null,
      user,
      caps,
      refreshUser,
      logout: async () => {
        await logoutFirebase()
        setUser(null)
        setCaps(EMPTY_CAPS)
        window.location.href = '/login'
      },
    }
  }, [loading, user, caps, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
