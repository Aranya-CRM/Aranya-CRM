/**
 * 全局"未保存更改"离开守卫。
 *
 * 页面存在未保存更改时通过 setUnsavedGuard 注册确认函数;
 * 布局层的导航入口在跳转前调用 confirmLeave(),返回 false 则取消跳转。
 * (BrowserRouter 无 useBlocker,采用显式守卫 + beforeunload 组合。)
 */
type Guard = () => boolean

let activeGuard: Guard | null = null

export function setUnsavedGuard(guard: Guard | null) {
  activeGuard = guard
}

/** true = 可以离开(无守卫,或用户确认放弃更改)。 */
export function confirmLeave(): boolean {
  return activeGuard === null || activeGuard()
}
