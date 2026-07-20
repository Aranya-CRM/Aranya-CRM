import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useUnsavedChangesGuard } from '../../../shared/hooks/useUnsavedChangesGuard'
import { confirmLeave } from '../../../shared/navigation/unsavedGuard'
import { fetchUsers } from '../../users/api/userManagement.api'
import type { UserSummary } from '../../users/types'
import { SETTINGS_PATH } from '../constants'
import { GRANT_GROUPS } from '../grantGroups'
import { GrantGroupCard } from './GrantGroupCard'
import { initials } from './userAvatar'

/**
 * 二级页面:为某个用户配置文件权限。
 * 授权内容由 GRANT_GROUPS 注册表驱动;返回前受未保存更改守卫保护。
 */
export function AccessUserDetail({ userId }: { userId: number }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [dirtyGroups, setDirtyGroups] = useState<Set<string>>(new Set())

  const anyDirty = dirtyGroups.size > 0
  useUnsavedChangesGuard(anyDirty, t('settings.leaveConfirm'))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchUsers()
      .then((list) => { if (!cancelled) setUser(list.find((u) => u.id === userId) ?? null) })
      .catch(() => { if (!cancelled) setError(t('settings.loadUsersError')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId, t])

  const handleDirtyChange = useCallback((groupId: string, dirty: boolean) => {
    setDirtyGroups((prev) => {
      const has = prev.has(groupId)
      if (dirty === has) return prev
      const next = new Set(prev)
      if (dirty) next.add(groupId)
      else next.delete(groupId)
      return next
    })
  }, [])

  function goBack() {
    // confirmLeave() 在有未保存更改时弹确认;无更改时直接返回 true。
    if (!confirmLeave()) return
    navigate(`${SETTINGS_PATH}/access`)
  }

  return (
    <div className="fa-section">
      <button className="fa-back" type="button" onClick={goBack}>
        <span className="fa-back-arrow" aria-hidden="true">‹</span>
        {t('settings.backToUsers')}
      </button>

      {error ? <div className="settings-error">{error}</div> : null}

      {loading ? (
        <p className="settings-loading">{t('common.loading')}</p>
      ) : !user ? (
        <div className="settings-empty">
          <span className="settings-empty-icon" aria-hidden="true">🔍</span>
          <p>{t('settings.userNotFound')}</p>
        </div>
      ) : (
        <>
          <div className="fa-selected-user">
            <span className="fa-avatar fa-avatar-lg" aria-hidden="true">
              {initials(user.fullName || user.email)}
            </span>
            <span className="fa-selected-text">
              <span className="fa-selected-name">{user.fullName || user.username || user.email}</span>
              <span className="fa-selected-email">{user.email}</span>
            </span>
          </div>

          <div className="fa-groups">
            {GRANT_GROUPS.map((group) => (
              <GrantGroupCard
                key={group.id}
                group={group}
                userId={user.id}
                onDirtyChange={handleDirtyChange}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
