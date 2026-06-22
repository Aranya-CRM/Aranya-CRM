import type { FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { UserRole } from '../types'
import '../pages/users.css'

export const ROLE_VALUES: UserRole[] = ['MANAGER', 'SOCIAL_WORKER', 'VOLUNTEER']

interface UserModalProps {
  titleKey: string
  titleSuffix?: string
  error?: string
  submitting: boolean
  submitLabel: string
  children: ReactNode
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function UserModal({
  titleKey,
  titleSuffix,
  error,
  submitting,
  submitLabel,
  children,
  onClose,
  onSubmit,
}: UserModalProps) {
  const { t } = useTranslation()

  return (
    <div className="users-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        className="users-modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <header className="users-modal-header">
          <div>
            <h2>{t(titleKey)}{titleSuffix ? ` — ${titleSuffix}` : ''}</h2>
          </div>
          <button className="users-modal-close" type="button" aria-label="Close" onClick={onClose}>
            x
          </button>
        </header>

        <div className="users-modal-body">{children}</div>
        {error ? <div className="users-form-error">{error}</div> : null}

        <footer className="users-modal-footer">
          <button className="users-secondary-button" type="button" disabled={submitting} onClick={onClose}>
            {t('users.modal.cancel')}
          </button>
          <button className="users-primary-button" type="submit" disabled={submitting}>
            {submitLabel}
          </button>
        </footer>
      </form>
    </div>
  )
}

export function UserTextField({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <label className="users-form-field">
      <span>{label}</span>
      <input
        className="users-form-input"
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function RoleCheckboxGroup({
  roles,
  onSelect,
}: {
  roles: UserRole[]
  onSelect: (role: UserRole) => void
}) {
  const { t } = useTranslation()
  const selectedRole = roles[0]

  return (
    <fieldset className="users-role-fieldset">
      <legend>{t('users.modal.roles')}</legend>
      <div className="users-role-options">
        {ROLE_VALUES.map((role) => (
          <label className="users-role-option" key={role}>
            <input
              type="radio"
              name="user-role"
              checked={selectedRole === role}
              onChange={() => onSelect(role)}
            />
            <span>{t(`users.role.${role}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
