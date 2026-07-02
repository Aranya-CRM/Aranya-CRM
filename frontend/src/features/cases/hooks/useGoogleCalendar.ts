import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Google Identity Services (GIS) token client 封装 —— 方案 A(前端直连)。
 * 用当前用户自己的 Google 授权拿 calendar.readonly 短时效 access token,
 * 供前端直接调 Google Calendar API 读「我的日历」。后端不参与。
 *
 * 需在构建期提供 VITE_GOOGLE_OAUTH_CLIENT_ID(Web OAuth client id);
 * 未配置时 available=false,个人日历相关 UI 自动隐藏(安全降级)。
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined
const STORAGE_KEY = 'aranya.gcal.connected'

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient(config: {
            client_id: string
            scope: string
            prompt?: string
            callback: (resp: TokenResponse) => void
            error_callback?: (err: unknown) => void
          }): TokenClient
          revoke?: (token: string, done?: () => void) => void
        }
      }
    }
  }
}

let gisPromise: Promise<void> | null = null
function loadGis(): Promise<void> {
  if (gisPromise) return gisPromise
  gisPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
  return gisPromise
}

export interface GoogleCalendarAuth {
  /** 是否配置了 client id(未配置时整块个人日历功能隐藏) */
  available: boolean
  /** 用户是否已授权连接(本地记忆 + 有有效 token) */
  connected: boolean
  /** 交互式授权(首次连接,会弹 Google 同意屏) */
  connect: () => void
  /** 断开并撤销 token */
  disconnect: () => void
  /** 返回一个有效 access token(静默续期);无法获取时返回 null */
  getToken: () => Promise<string | null>
}

export function useGoogleCalendar(): GoogleCalendarAuth {
  const available = Boolean(CLIENT_ID)
  const [connected, setConnected] = useState<boolean>(() => localStorage.getItem(STORAGE_KEY) === '1')
  const clientRef = useRef<TokenClient | null>(null)
  const tokenRef = useRef<string | null>(null)
  const expiryRef = useRef<number>(0)
  const pendingRef = useRef<((token: string | null) => void) | null>(null)

  useEffect(() => {
    if (!available) return
    let cancelled = false
    loadGis()
      .then(() => {
        if (cancelled) return
        const oauth = window.google?.accounts?.oauth2
        if (!oauth) return
        clientRef.current = oauth.initTokenClient({
          client_id: CLIENT_ID!,
          scope: SCOPE,
          callback: (resp) => {
            if (resp.access_token) {
              tokenRef.current = resp.access_token
              expiryRef.current = Date.now() + (resp.expires_in ?? 3600) * 1000
              setConnected(true)
              localStorage.setItem(STORAGE_KEY, '1')
              pendingRef.current?.(resp.access_token)
            } else {
              pendingRef.current?.(null)
            }
            pendingRef.current = null
          },
          error_callback: () => {
            pendingRef.current?.(null)
            pendingRef.current = null
          },
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [available])

  const connect = useCallback(() => {
    clientRef.current?.requestAccessToken({ prompt: 'consent' })
  }, [])

  const disconnect = useCallback(() => {
    const token = tokenRef.current
    if (token) window.google?.accounts?.oauth2?.revoke?.(token)
    tokenRef.current = null
    expiryRef.current = 0
    setConnected(false)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const getToken = useCallback((): Promise<string | null> => {
    const client = clientRef.current
    if (!client) return Promise.resolve(null)
    // 有效期内(留 60s 余量)直接复用
    if (tokenRef.current && Date.now() < expiryRef.current - 60_000) {
      return Promise.resolve(tokenRef.current)
    }
    // 静默续期:已授权过则无 UI;未授权则走 error_callback 返回 null
    return new Promise<string | null>((resolve) => {
      pendingRef.current = resolve
      client.requestAccessToken({ prompt: '' })
    })
  }, [])

  return { available, connected, connect, disconnect, getToken }
}
