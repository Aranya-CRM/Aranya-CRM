import { useEffect, useState, useCallback, useRef } from 'react';

interface UseIdleLogoutOptions {
    timeoutMs: number;

    warningMs: number;

    onLogout: () => void;

    enabled?: boolean;
}

interface UseIdleLogoutResult {
    isWarning: boolean;

    warningSecondsLeft: number;

    stayLoggedIn: () => void;

    logoutNow: () => void;
}

export function useIdleLogout({
    timeoutMs,
    warningMs,
    onLogout,
    enabled = true,
}: UseIdleLogoutOptions): UseIdleLogoutResult {
    const [isWarning, setIsWarning] = useState(false);
    const [warningSecondsLeft, setWarningSecondsLeft] = useState(0)

    const warningTimerRef = useRef<number | null>(null);
    const logoutTimerRef = useRef<number | null>(null);
    const countdownIntervalRef = useRef<number | null>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const onLogoutRef = useRef(onLogout);

    useEffect(() => {
        onLogoutRef.current = onLogout
    }, [onLogout])

    const clearAllTimers = useCallback(() =>{
        if (warningTimerRef.current !==null){
            window.clearTimeout(warningTimerRef.current)
            warningTimerRef.current = null
        }

        if (logoutTimerRef.current !==null){
            window.clearTimeout(logoutTimerRef.current)
            logoutTimerRef.current = null
        }

        if (countdownIntervalRef.current !== null){
            window.clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
        }
    },[])

    const resetIdleTimer = useCallback(
        (notifyOtherTabs: boolean) => {
            clearAllTimers()
            setIsWarning(false)

            if (notifyOtherTabs && channelRef.current) {
                try {
                    channelRef.current.postMessage('active')
                }catch{
                    // 可能在某些隐私模式或浏览器中不支持 BroadcastChannel
                }
            }

            const silentMs = timeoutMs - warningMs
            warningTimerRef.current = window.setTimeout(() =>{
                setIsWarning(true)
                setWarningSecondsLeft(Math.ceil(warningMs / 1000))

                countdownIntervalRef.current = window.setInterval(() => {
                    setWarningSecondsLeft((s) => Math.max(0,s-1))
                },1000)

                logoutTimerRef.current = window.setTimeout(() => {
                    clearAllTimers()
                    setIsWarning(false)
                    onLogoutRef.current()
                }, warningMs)
            }, silentMs)
        },
        [timeoutMs, warningMs, clearAllTimers]
    )

    const stayLoggedIn = useCallback(() => {
        resetIdleTimer(true)
    },[resetIdleTimer])

    const logoutNow = useCallback(() => {
        clearAllTimers()
        setIsWarning(false)
        onLogoutRef.current()
    }, [clearAllTimers])

    useEffect(() => {
        if (!enabled) {
            clearAllTimers()
            setIsWarning(false)
            return
        }

        const channel = typeof BroadcastChannel !== 'undefined'
            ? new BroadcastChannel('idle-logout')
            : null
        
        channelRef.current = channel

        const handleActivity = () =>{
            if (isWarningRef.current) return
            resetIdleTimer(false)
        }

        const isWarningRef = { current: false }

        const syncWarning = () => {
            isWarningRef.current = isWarning
        }

        syncWarning()

        const events = ['mousemove', 'keydown', 'scroll', 'touchstart','wheel']

        events.forEach((event) => window.addEventListener(event, handleActivity,{passive: true})
        )
 const handleVisibilityChange = () => {
      if (!document.hidden && !isWarningRef.current) {
        resetIdleTimer(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 跨 tab 消息(其他 tab 活跃 → 我也 reset,但不再广播,避免循环)
    const handleCrossTabMessage = () => {
      if (!isWarningRef.current) {
        resetIdleTimer(false)
      }
    }
    channel?.addEventListener('message', handleCrossTabMessage)

    // 启动初始倒计时
    resetIdleTimer(false)

    return () => {
      clearAllTimers()
      events.forEach((e) => window.removeEventListener(e, handleActivity))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      channel?.removeEventListener('message', handleCrossTabMessage)
      channel?.close()
      channelRef.current = null
    }
  }, [enabled, resetIdleTimer, clearAllTimers, isWarning])

  return {
    isWarning,
    warningSecondsLeft,
    stayLoggedIn,
    logoutNow,
  }

}

