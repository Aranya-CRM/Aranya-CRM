import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { fetchUsers } from '../../users/api/userManagement.api'
import type { UserSummary } from '../../users/types'
import { SETTINGS_PATH } from '../constants'
import { initials } from './userAvatar'

/**
 * 一级页面:全部用户列表。
 * 仅展示头像、姓名、账号与搜索,不获取也不渲染任何角色或权限信息。
 * 点击某用户进入二级权限页面(/settings/access/:userId)。
 */
export function AccessUserList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserSummary[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let cancelled = false
    fetchUsers()
      .then((list) => { if (!cancelled) setUsers(list) })
      .catch(() => { if (!cancelled) setError(t('settings.loadUsersError')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [t])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      `${u.fullName ?? ''} ${u.email ?? ''} ${u.username ?? ''}`.toLowerCase().includes(q))
  }, [users, query])

  return (
    <div className="fa-section">
      <header className="fa-header">
        <h2>{t('settings.grants.title')}</h2>
        <p>{t('settings.grants.subtitle')}</p>
      </header>

      {error ? <div className="settings-error">{error}</div> : null}

      <div className="fa-search">
        <span className="fa-search-icon" aria-hidden="true">🔍</span>
        <input
          className="fa-search-input"
          type="search"
          placeholder={t('settings.searchUser')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {loading ? (
        <p className="settings-loading">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <div className="settings-empty">
          <span className="settings-empty-icon" aria-hidden="true">🔍</span>
          <p>{t('settings.noUsersFound')}</p>
        </div>
      ) : (
        <ul className="fa-userlist">
          {filtered.map((user) => (
            <li key={user.id}>
              <button
                className="fa-userlist-row"
                type="button"
                onClick={() => navigate(`${SETTINGS_PATH}/access/${user.id}`)}
              >
                <span className="fa-avatar" aria-hidden="true">
                  {initials(user.fullName || user.email)}
                </span>
                <span className="fa-userlist-text">
                  <span className="fa-userlist-name">{user.fullName || user.username || user.email}</span>
                  <span className="fa-userlist-email">{user.email}</span>
                </span>
                <span className="fa-userlist-chevron" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
