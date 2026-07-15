import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchUsers } from '../../users/api/userManagement.api'
import type { UserSummary } from '../../users/types'
import {
  DOCUMENT_CATEGORIES,
  fetchDocumentAccess,
  saveDocumentAccess,
  type DocumentCategory,
} from '../api/documentAccess.api'
import './settings.css'

export function SettingsPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<UserSummary[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [loadingAccess, setLoadingAccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string>()
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => setError(t('settings.loadUsersError')))
  }, [t])

  useEffect(() => {
    if (selectedUserId == null) return
    setLoadingAccess(true)
    setSaved(false)
    setError(undefined)
    fetchDocumentAccess(selectedUserId)
      .then((access) => setCategories(access.categories))
      .catch(() => setError(t('settings.loadAccessError')))
      .finally(() => setLoadingAccess(false))
  }, [selectedUserId, t])

  const selectedUser = users.find((u) => u.id === selectedUserId)
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      (u.fullName ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q))
  }, [users, search])

  function toggleCategory(category: DocumentCategory) {
    setSaved(false)
    setCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category])
  }

  async function handleSave() {
    if (selectedUserId == null) return
    setSaving(true)
    setError(undefined)
    try {
      const updated = await saveDocumentAccess(selectedUserId, categories)
      setCategories(updated.categories)
      setSaved(true)
    } catch {
      setError(t('settings.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.documentAccess.subtitle')}</p>
      </header>

      {error ? <div className="settings-error">{error}</div> : null}

      <div className="settings-grid">
        <aside className="settings-user-list">
          <input
            className="settings-search"
            placeholder={t('settings.searchUser')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="settings-user-scroll">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                className={'settings-user-row' + (u.id === selectedUserId ? ' active' : '')}
                onClick={() => setSelectedUserId(u.id)}
              >
                <span className="settings-user-name">{u.fullName || u.email}</span>
                <span className="settings-user-role">{u.roles.join(', ')}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="settings-detail">
          {selectedUser ? (
            <>
              <h2 className="settings-detail-title">{selectedUser.fullName || selectedUser.email}</h2>
              <p className="settings-detail-hint">{t('settings.documentAccess.title')}</p>
              {loadingAccess ? (
                <p className="settings-empty">{t('common.loading')}</p>
              ) : (
                <>
                  <div className="settings-category-list">
                    {DOCUMENT_CATEGORIES.map((category) => (
                      <label key={category} className="settings-category-item">
                        <input
                          type="checkbox"
                          checked={categories.includes(category)}
                          onChange={() => toggleCategory(category)}
                        />
                        <span>{t(`settings.documentAccess.category.${category.toLowerCase()}`)}</span>
                      </label>
                    ))}
                  </div>
                  <div className="settings-actions">
                    <button className="btn-primary" type="button" disabled={saving} onClick={() => void handleSave()}>
                      {saving ? t('common.saving') : t('common.save')}
                    </button>
                    {saved ? <span className="settings-saved">{t('settings.saved')}</span> : null}
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="settings-empty">{t('settings.selectUser')}</p>
          )}
        </section>
      </div>
    </div>
  )
}
