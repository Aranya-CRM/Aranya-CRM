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

/** Roles whose role_cap already grants every document category (migration 066-3). */
const BASELINE_FULL_ROLES = new Set(['ADMIN', 'MANAGER', 'FULL_MANAGER', 'TEAM_LEAD', 'VIEW_MANAGER'])

const CATEGORY_ICONS: Record<DocumentCategory, string> = {
  ORDINATION: '📜',
  MEDICAL: '🩺',
  FINANCIAL: '💰',
  LEGAL: '⚖',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function sameSet(a: DocumentCategory[], b: DocumentCategory[]): boolean {
  if (a.length !== b.length) return false
  const bs = new Set(b)
  return a.every((x) => bs.has(x))
}

function hasBaselineFull(user: UserSummary): boolean {
  return user.roles.some((role) => BASELINE_FULL_ROLES.has(role))
}

export function SettingsPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<UserSummary[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [initialCategories, setInitialCategories] = useState<DocumentCategory[]>([])
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
      .then((access) => {
        setCategories(access.categories)
        setInitialCategories(access.categories)
      })
      .catch(() => setError(t('settings.loadAccessError')))
      .finally(() => setLoadingAccess(false))
  }, [selectedUserId, t])

  const selectedUser = users.find((u) => u.id === selectedUserId)
  const baselineFull = selectedUser ? hasBaselineFull(selectedUser) : false
  const dirty = !baselineFull && !sameSet(categories, initialCategories)

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      (u.fullName ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q))
  }, [users, search])

  function toggleCategory(category: DocumentCategory) {
    if (baselineFull) return
    setSaved(false)
    setCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category])
  }

  function handleReset() {
    setCategories(initialCategories)
    setSaved(false)
  }

  async function handleSave() {
    if (selectedUserId == null) return
    setSaving(true)
    setError(undefined)
    try {
      const updated = await saveDocumentAccess(selectedUserId, categories)
      setCategories(updated.categories)
      setInitialCategories(updated.categories)
      setSaved(true)
    } catch {
      setError(t('settings.saveError'))
    } finally {
      setSaving(false)
    }
  }

  function grantSummary(user: UserSummary, isSelected: boolean): string {
    if (hasBaselineFull(user)) return t('settings.documentAccess.allViaRole')
    // Only the selected user's grants are fetched; others show role context only.
    if (isSelected) {
      return categories.length === 0
        ? t('settings.documentAccess.grantedNone')
        : t('settings.documentAccess.grantedCount', { count: categories.length })
    }
    return ''
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.subtitle')}</p>
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
          <div className="settings-user-list-head">
            {t('settings.usersHeading')} · {filteredUsers.length}
          </div>
          <div className="settings-user-scroll">
            {filteredUsers.map((u) => {
              const isSelected = u.id === selectedUserId
              const summary = grantSummary(u, isSelected)
              const full = hasBaselineFull(u)
              return (
                <button
                  key={u.id}
                  type="button"
                  className={'settings-user-row' + (isSelected ? ' active' : '')}
                  onClick={() => setSelectedUserId(u.id)}
                >
                  <span className="settings-user-avatar" aria-hidden="true">{initials(u.fullName || u.email)}</span>
                  <span className="settings-user-main">
                    <span className="settings-user-name">{u.fullName || u.email}</span>
                    <span className="settings-user-email">{u.email}</span>
                  </span>
                  <span className="settings-user-tags">
                    <span className="settings-user-role">{u.roles.join(', ')}</span>
                    {summary ? (
                      <span className={'settings-user-grant' + (full ? ' full' : '')}>{summary}</span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="settings-detail">
          {!selectedUser ? (
            <div className="settings-empty">
              <span className="settings-empty-icon" aria-hidden="true">🔐</span>
              <p>{t('settings.selectUser')}</p>
            </div>
          ) : (
            <>
              <div className="settings-detail-user">
                <span className="settings-detail-avatar" aria-hidden="true">
                  {initials(selectedUser.fullName || selectedUser.email)}
                </span>
                <div className="settings-detail-identity">
                  <h2>{selectedUser.fullName || selectedUser.email}</h2>
                  <span className="settings-detail-email">{selectedUser.email}</span>
                  <div className="settings-detail-roles">
                    {selectedUser.roles.map((role) => (
                      <span key={role} className="settings-role-badge">{role}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-detail-section">
                <h3 className="settings-detail-section-title">{t('settings.documentAccess.title')}</h3>
                <p className="settings-detail-section-sub">{t('settings.documentAccess.subtitle')}</p>

                {baselineFull ? (
                  <div className="settings-banner">{t('settings.documentAccess.baselineFull')}</div>
                ) : null}

                {loadingAccess ? (
                  <p className="settings-loading">{t('common.loading')}</p>
                ) : (
                  <div className="settings-category-grid">
                    {DOCUMENT_CATEGORIES.map((category) => {
                      const checked = baselineFull || categories.includes(category)
                      return (
                        <label
                          key={category}
                          className={
                            'settings-category-card'
                            + (checked ? ' checked' : '')
                            + (baselineFull ? ' locked' : '')
                          }
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={baselineFull}
                            onChange={() => toggleCategory(category)}
                          />
                          <span className="settings-category-icon" aria-hidden="true">
                            {CATEGORY_ICONS[category]}
                          </span>
                          <span className="settings-category-text">
                            <span className="settings-category-name">
                              {t(`settings.documentAccess.category.${category.toLowerCase()}`)}
                            </span>
                            <span className="settings-category-desc">
                              {t(`settings.documentAccess.categoryDesc.${category.toLowerCase()}`)}
                            </span>
                          </span>
                          <span className="settings-category-check" aria-hidden="true" />
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {!baselineFull ? (
                <footer className="settings-detail-footer">
                  <span className="settings-footer-note">
                    {dirty ? t('settings.unsavedHint') : t('settings.effectiveNote')}
                  </span>
                  <div className="settings-footer-actions">
                    {saved ? <span className="settings-saved">✓ {t('settings.saved')}</span> : null}
                    <button
                      className="btn-secondary"
                      type="button"
                      disabled={!dirty || saving}
                      onClick={handleReset}
                    >
                      {t('settings.reset')}
                    </button>
                    <button
                      className="btn-primary"
                      type="button"
                      disabled={!dirty || saving}
                      onClick={() => void handleSave()}
                    >
                      {saving ? t('common.saving') : t('common.save')}
                    </button>
                  </div>
                </footer>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
