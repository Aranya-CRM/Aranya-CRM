import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Select } from 'antd'
import { useUnsavedChangesGuard } from '../../../shared/hooks/useUnsavedChangesGuard'
import { fetchUsers } from '../../users/api/userManagement.api'
import type { UserSummary } from '../../users/types'
import { GRANT_GROUPS } from '../grantGroups'
import { GrantGroupCard } from './GrantGroupCard'

interface UserOption {
  value: number
  label: string
  email: string
  search: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * 访问权限分区 —— 按用户的纯增量授权。不获取、不渲染任何角色信息。
 * 授权内容由 GRANT_GROUPS 注册表驱动:新增可授予权限族只需在注册表追加一条,本组件无需改动。
 */
export function AccessSection() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<UserSummary[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [dirtyGroups, setDirtyGroups] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string>()

  const anyDirty = dirtyGroups.size > 0
  useUnsavedChangesGuard(anyDirty, t('settings.leaveConfirm'))

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => setError(t('settings.loadUsersError')))
  }, [t])

  const selectedUser = users.find((u) => u.id === selectedUserId)

  const options = useMemo<UserOption[]>(() => users.map((u) => ({
    value: u.id,
    label: u.fullName || u.email,
    email: u.email,
    search: `${u.fullName ?? ''} ${u.email ?? ''}`.toLowerCase(),
  })), [users])

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

  function handleSelectUser(id: number) {
    if (id === selectedUserId) return
    if (anyDirty && !window.confirm(t('settings.leaveConfirm'))) return
    setDirtyGroups(new Set())
    setSelectedUserId(id)
  }

  return (
    <div className="fa-section">
      <header className="fa-header">
        <h2>{t('settings.grants.title')}</h2>
        <p>{t('settings.grants.subtitle')}</p>
      </header>

      {error ? <div className="settings-error">{error}</div> : null}

      <Select<number, UserOption>
        className="fa-user-select"
        showSearch
        placeholder={t('settings.searchUser')}
        value={selectedUserId ?? undefined}
        onSelect={(value) => handleSelectUser(value)}
        options={options}
        filterOption={(input, option) => (option?.search ?? '').includes(input.trim().toLowerCase())}
        optionRender={(option) => (
          <span className="fa-user-option">
            <span className="fa-avatar" aria-hidden="true">{initials(String(option.data.label))}</span>
            <span className="fa-user-option-text">
              <span className="fa-user-option-name">{option.data.label}</span>
              <span className="fa-user-option-email">{option.data.email}</span>
            </span>
          </span>
        )}
      />

      {!selectedUser ? (
        <div className="settings-empty">
          <span className="settings-empty-icon" aria-hidden="true">🔐</span>
          <p>{t('settings.selectUser')}</p>
        </div>
      ) : (
        <>
          <div className="fa-selected-user">
            <span className="fa-avatar fa-avatar-lg" aria-hidden="true">
              {initials(selectedUser.fullName || selectedUser.email)}
            </span>
            <span className="fa-selected-text">
              <span className="fa-selected-name">{selectedUser.fullName || selectedUser.email}</span>
              <span className="fa-selected-email">{selectedUser.email}</span>
            </span>
          </div>

          <div className="fa-groups">
            {GRANT_GROUPS.map((group) => (
              <GrantGroupCard
                key={group.id}
                group={group}
                userId={selectedUser.id}
                onDirtyChange={handleDirtyChange}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
