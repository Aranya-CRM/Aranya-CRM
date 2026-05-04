import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ALL_ROLES, type UserRole } from '../../services/auth'

const ROLE_LABEL: Record<UserRole, { zh: string; en: string }> = {
  VOLUNTEER: { zh: '义工', en: 'Volunteer' },
  SOCIAL_WORKER: { zh: '社工', en: 'Social Worker' },
  MANAGER: { zh: '管理员', en: 'Manager' },
}

const RESET_VALUE = '__RESET__'

/**
 * Dev-only widget that lets us pretend to be each of the three roles without
 * re-logging-in. Renders nothing in production builds (gated by
 * `import.meta.env.DEV`). Switching navigates back to /dashboard so the user
 * doesn't end up locked on a route the new role isn't allowed to see.
 */
export function DevRoleSwitcher() {
  const { roleOverride, setRoleOverride, primaryRole, user } = useAuth()
  const navigate = useNavigate()

  if (!import.meta.env.DEV || !setRoleOverride) {
    return null
  }

  const realRoles = user.roles
  const current = roleOverride ?? primaryRole

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    if (!setRoleOverride) return
    const next = event.target.value
    if (next === RESET_VALUE) {
      setRoleOverride(null)
    } else {
      setRoleOverride(next as UserRole)
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <label className="dev-role-switcher" title="Dev only — switch the active role">
      <span className="dev-role-switcher-label">DEV</span>
      <select
        className={
          'dev-role-switcher-select' +
          (current ? ` dev-role-${current.toLowerCase()}` : '')
        }
        value={roleOverride ?? RESET_VALUE}
        onChange={handleChange}
      >
        <option value={RESET_VALUE}>
          Real role
          {realRoles.length > 0 ? ` (${realRoles.join(', ')})` : ''}
        </option>
        {ALL_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r].zh} / {ROLE_LABEL[r].en}
          </option>
        ))}
      </select>
    </label>
  )
}
