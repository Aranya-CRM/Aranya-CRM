import { useEffect } from 'react'
import { setUnsavedGuard } from '../navigation/unsavedGuard'

/**
 * dirty 为 true 时:
 * - 注册全局离开守卫(布局导航跳转前弹 confirm)
 * - 注册 beforeunload(刷新/关闭标签页时浏览器原生拦截)
 */
export function useUnsavedChangesGuard(dirty: boolean, message: string) {
  useEffect(() => {
    if (!dirty) return

    setUnsavedGuard(() => window.confirm(message))
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      setUnsavedGuard(null)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [dirty, message])
}
