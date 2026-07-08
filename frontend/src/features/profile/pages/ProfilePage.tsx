import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../contexts/AuthContext'
import '../../../shared/ui/shared.css'
import './profile.css'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function statusBadgeClass(status?: string): string {
  return status === 'ACTIVE' ? 'profile-badge status-active' : 'profile-badge status-inactive'
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function ProfilePage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="profile-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('profile.title')}</h1>
          <div className="page-subtitle">{t('profile.subtitle')}</div>
        </div>
      </div>

      <div className="card profile-card">
        <div className="profile-hero">
          <div className="profile-avatar" aria-hidden="true">{initials(user.fullName)}</div>
          <div className="profile-hero-text">
            <div className="profile-name">{user.fullName}</div>
            <div className="profile-email-sub">{user.email}</div>
          </div>
        </div>

        <dl className="profile-info">
          <div className="profile-row">
            <dt>{t('profile.fields.email')}</dt>
            <dd>
              {user.email}
              {user.emailVerified
                ? <span className="profile-badge profile-verified">{t('profile.verified')}</span>
                : <span className="profile-badge profile-unverified">{t('profile.unverified')}</span>}
            </dd>
          </div>
          <div className="profile-row">
            <dt>{t('profile.fields.username')}</dt>
            <dd>{user.username || '—'}</dd>
          </div>
          <div className="profile-row">
            <dt>{t('profile.fields.phone')}</dt>
            <dd>{user.phone || '—'}</dd>
          </div>
          <div className="profile-row">
            <dt>{t('profile.fields.status')}</dt>
            <dd>
              <span className={statusBadgeClass(user.status)}>
                {t(`users.status.${user.status}`, { defaultValue: user.status ?? '—' })}
              </span>
            </dd>
          </div>
          <div className="profile-row">
            <dt>{t('profile.fields.memberSince')}</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
