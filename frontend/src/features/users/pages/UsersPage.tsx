import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { ErrorBanner, PageHeader, SectionCard, TableShell } from '../../../shared/ui'
import {
  useDeleteUser,
  useInviteUser,
  useUpdateUserRoles,
  useUpdateUserStatus,
  useUsers,
} from '../hooks'
import type { InviteUserPayload, UserRole, UserStatus, UserSummary } from '../types'
import './users.css'

const ROLE_OPTIONS: Array<{ value: UserRole; labelZh: string; labelEn: string }> = [
  { value: 'MANAGER', labelZh: '管理员', labelEn: 'Manager' },
  { value: 'SOCIAL_WORKER', labelZh: '社工', labelEn: 'Social Worker' },
  { value: 'VOLUNTEER', labelZh: '义工', labelEn: 'Volunteer' },
]

const initialInviteForm: InviteUserPayload = {
  username: '',
  fullName: '',
  email: '',
  phone: '',
  roles: ['VOLUNTEER'],
}

function roleLabel(role: UserRole): string {
  const option = ROLE_OPTIONS.find((item) => item.value === role)
  return option ? `${option.labelZh} · ${option.labelEn}` : String(role)
}

function statusLabel(status: UserStatus): string {
  return status === 'ACTIVE' ? '活跃 · Active' : '停用 · Inactive'
}

function normalizeText(value: string | null | undefined, fallback = '-'): string {
  const text = value?.trim()
  return text || fallback
}

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const { data: users = [], isLoading, isError } = useUsers()
  const inviteUser = useInviteUser()
  const updateRoles = useUpdateUserRoles()
  const updateStatus = useUpdateUserStatus()
  const deleteUser = useDeleteUser()
  const [search, setSearch] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteUserPayload>(initialInviteForm)
  const [editingUser, setEditingUser] = useState<UserSummary>()
  const [editingRoles, setEditingRoles] = useState<UserRole[]>([])
  const [formError, setFormError] = useState<string>()

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users

    return users.filter((user) => {
      return (
        user.fullName.toLowerCase().includes(q) ||
        user.username.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.roles.some((role) => String(role).toLowerCase().includes(q))
      )
    })
  }, [search, users])

  const activeUsers = useMemo(
    () => users.filter((user) => user.status === 'ACTIVE').length,
    [users],
  )
  const volunteers = useMemo(
    () => users.filter((user) => user.roles.includes('VOLUNTEER')).length,
    [users],
  )

  function openInviteModal() {
    setFormError(undefined)
    setInviteForm(initialInviteForm)
    setShowInviteModal(true)
  }

  function closeInviteModal() {
    if (inviteUser.isPending) return
    setShowInviteModal(false)
    setFormError(undefined)
    setInviteForm(initialInviteForm)
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(undefined)

    if (inviteForm.roles.length === 0) {
      setFormError('请至少选择一个角色。 / Select at least one role.')
      return
    }

    try {
      await inviteUser.mutateAsync({
        ...inviteForm,
        username: inviteForm.username.trim(),
        fullName: inviteForm.fullName.trim(),
        email: inviteForm.email.trim(),
        phone: inviteForm.phone?.trim() || undefined,
      })
      closeInviteModal()
    } catch {
      setFormError('用户邀请失败，请检查信息后重试。 / Failed to invite user.')
    }
  }

  function openRoleEditor(user: UserSummary) {
    setFormError(undefined)
    setEditingUser(user)
    setEditingRoles(user.roles)
  }

  function closeRoleEditor() {
    if (updateRoles.isPending) return
    setEditingUser(undefined)
    setEditingRoles([])
    setFormError(undefined)
  }

  async function submitRoleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingUser) return
    setFormError(undefined)

    if (editingRoles.length === 0) {
      setFormError('请至少选择一个角色。 / Select at least one role.')
      return
    }

    try {
      await updateRoles.mutateAsync({
        id: editingUser.id,
        data: { roles: editingRoles },
      })
      closeRoleEditor()
    } catch {
      setFormError('角色更新失败，请稍后重试。 / Failed to update roles.')
    }
  }

  async function toggleStatus(user: UserSummary) {
    const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const confirmed = window.confirm(
      nextStatus === 'ACTIVE'
        ? `确认启用 ${user.fullName}？ / Activate this account?`
        : `确认停用 ${user.fullName}？ / Deactivate this account?`,
    )
    if (!confirmed) return

    try {
      await updateStatus.mutateAsync({ id: user.id, data: { status: nextStatus } })
    } catch {
      // Mutation error state renders the page-level banner.
    }
  }

  async function handleDelete(user: UserSummary) {
    const confirmed = window.confirm(
      `确认移除或停用 ${user.fullName} 的账号？ / Remove or deactivate this account?`,
    )
    if (!confirmed) return

    try {
      await deleteUser.mutateAsync(user.id)
    } catch {
      // Mutation error state renders the page-level banner.
    }
  }

  const actionError = updateStatus.isError || deleteUser.isError

  return (
    <div className="users-page">
      <PageHeader
        titleZh="用户管理"
        titleEn="User Management · 管理员专用 · Manager Only"
        actions={(
          <button className="users-primary-button" type="button" onClick={openInviteModal}>
            + 新增用户 · Add User
          </button>
        )}
      />

      <section className="users-manager-banner" aria-label="Manager user management notice">
        <div>
          <strong>管理员视图 · Manager View</strong>
          <span>您可以创建、编辑、停用或移除用户账号。</span>
        </div>
        <p>You can create, edit, deactivate, or remove user accounts.</p>
      </section>

      {isError ? <ErrorBanner message="用户列表加载失败，请稍后重试。 / Failed to load users." /> : null}
      {actionError ? <ErrorBanner message="用户操作失败，请刷新后重试。 / User action failed." /> : null}

      <div className="users-toolbar">
        <input
          className="users-search-input"
          type="text"
          placeholder="搜索姓名、邮箱或角色 · Search users..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <SectionCard className="users-table-card" ariaLabel="Users list">
        <TableShell>
          <table className="users-table">
            <colgroup>
              <col className="col-user-name" />
              <col className="col-user-role" />
              <col className="col-user-email" />
              <col className="col-user-status" />
              <col className="col-user-last-login" />
              <col className="col-user-actions" />
            </colgroup>
            <thead>
              <tr>
                <th><span className="users-th-zh">姓名</span><span className="users-th-en">Name</span></th>
                <th><span className="users-th-zh">角色</span><span className="users-th-en">Role</span></th>
                <th><span className="users-th-zh">邮箱</span><span className="users-th-en">Email</span></th>
                <th><span className="users-th-zh">状态</span><span className="users-th-en">Status</span></th>
                <th><span className="users-th-zh">最后登录</span><span className="users-th-en">Last Login</span></th>
                <th><span className="users-th-zh">操作</span><span className="users-th-en">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="users-table-state" colSpan={6}>加载中 · Loading...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td className="users-table-state" colSpan={6}>暂无用户 · No users found</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser?.id

                  return (
                    <tr key={user.id}>
                      <td>
                        <span className="users-cell-strong">{normalizeText(user.fullName)}</span>
                        <span className="users-cell-muted">
                          @{normalizeText(user.username, 'username')}{isSelf ? ' · 当前账号 / You' : ''}
                        </span>
                      </td>
                      <td>
                        <div className="users-role-stack">
                          {user.roles.map((role) => (
                            <span className={`users-role-badge users-role-${String(role).toLowerCase()}`} key={role}>
                              {roleLabel(role)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td><span className="users-cell-main">{normalizeText(user.email)}</span></td>
                      <td>
                        <span className={`users-status-badge users-status-${user.status.toLowerCase()}`}>
                          {statusLabel(user.status)}
                        </span>
                      </td>
                      <td><span className="users-cell-main">-</span></td>
                      <td>
                        <div className="users-row-actions">
                          <button
                            className="users-action-link"
                            type="button"
                            disabled={isSelf}
                            title={isSelf ? '当前账号不能编辑自己的角色 / You cannot edit your own roles' : undefined}
                            onClick={() => openRoleEditor(user)}
                          >
                            编辑 · Edit
                          </button>
                          <button
                            className="users-action-link users-action-warning"
                            type="button"
                            disabled={isSelf || updateStatus.isPending}
                            title={isSelf ? '当前账号不能停用自己 / You cannot deactivate yourself' : undefined}
                            onClick={() => void toggleStatus(user)}
                          >
                            {user.status === 'ACTIVE' ? '停用 · Deactivate' : '启用 · Activate'}
                          </button>
                          <button
                            className="users-action-link users-action-danger"
                            type="button"
                            disabled={isSelf || deleteUser.isPending}
                            title={isSelf ? '当前账号不能移除自己 / You cannot remove yourself' : undefined}
                            onClick={() => void handleDelete(user)}
                          >
                            移除 · Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </TableShell>
      </SectionCard>

      <div className="users-summary-grid">
        <SummaryCard titleZh="总用户数" titleEn="Total Users" value={users.length} />
        <SummaryCard titleZh="活跃用户" titleEn="Active" value={activeUsers} />
        <SummaryCard titleZh="义工" titleEn="Volunteers" value={volunteers} />
      </div>

      {showInviteModal ? (
        <UserModal
          titleZh="新增用户"
          titleEn="Add User"
          error={formError}
          submitting={inviteUser.isPending}
          submitLabel={inviteUser.isPending ? '创建中 · Creating...' : '创建用户 · Create User'}
          onClose={closeInviteModal}
          onSubmit={submitInvite}
        >
          <UserTextField
            label="用户名 / Username"
            required
            value={inviteForm.username}
            onChange={(value) => setInviteForm((current) => ({ ...current, username: value }))}
          />
          <UserTextField
            label="姓名 / Full Name"
            required
            value={inviteForm.fullName}
            onChange={(value) => setInviteForm((current) => ({ ...current, fullName: value }))}
          />
          <UserTextField
            label="邮箱 / Email"
            required
            type="email"
            value={inviteForm.email}
            onChange={(value) => setInviteForm((current) => ({ ...current, email: value }))}
          />
          <UserTextField
            label="电话 / Phone"
            value={inviteForm.phone ?? ''}
            onChange={(value) => setInviteForm((current) => ({ ...current, phone: value }))}
          />
          <RoleCheckboxGroup
            roles={inviteForm.roles}
            onSelect={(role) => setInviteForm((current) => ({ ...current, roles: [role] }))}
          />
        </UserModal>
      ) : null}

      {editingUser ? (
        <UserModal
          titleZh="编辑角色"
          titleEn={editingUser.fullName}
          error={formError}
          submitting={updateRoles.isPending}
          submitLabel={updateRoles.isPending ? '保存中 · Saving...' : '保存角色 · Save Roles'}
          onClose={closeRoleEditor}
          onSubmit={submitRoleUpdate}
        >
          <RoleCheckboxGroup
            roles={editingRoles}
            onSelect={(role) => setEditingRoles([role])}
          />
        </UserModal>
      ) : null}
    </div>
  )
}

function SummaryCard({ titleZh, titleEn, value }: { titleZh: string; titleEn: string; value: number }) {
  return (
    <div className="users-summary-card">
      <span>{titleZh}</span>
      <small>{titleEn}</small>
      <strong>{value}</strong>
    </div>
  )
}

interface UserModalProps {
  titleZh: string
  titleEn: string
  error?: string
  submitting: boolean
  submitLabel: string
  children: React.ReactNode
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function UserModal({
  titleZh,
  titleEn,
  error,
  submitting,
  submitLabel,
  children,
  onClose,
  onSubmit,
}: UserModalProps) {
  return (
    <div className="users-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        className="users-modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <header className="users-modal-header">
          <div>
            <h2>{titleZh}</h2>
            <span>{titleEn}</span>
          </div>
          <button className="users-modal-close" type="button" aria-label="Close" onClick={onClose}>
            x
          </button>
        </header>

        <div className="users-modal-body">{children}</div>
        {error ? <div className="users-form-error">{error}</div> : null}

        <footer className="users-modal-footer">
          <button className="users-secondary-button" type="button" disabled={submitting} onClick={onClose}>
            取消 · Cancel
          </button>
          <button className="users-primary-button" type="submit" disabled={submitting}>
            {submitLabel}
          </button>
        </footer>
      </form>
    </div>
  )
}

function UserTextField({
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

function RoleCheckboxGroup({
  roles,
  onSelect,
}: {
  roles: UserRole[]
  onSelect: (role: UserRole) => void
}) {
  const selectedRole = roles[0]

  return (
    <fieldset className="users-role-fieldset">
      <legend>角色 / Roles</legend>
      <div className="users-role-options">
        {ROLE_OPTIONS.map((role) => (
          <label className="users-role-option" key={role.value}>
            <input
              type="radio"
              name="user-role"
              checked={selectedRole === role.value}
              onChange={() => onSelect(role.value)}
            />
            <span>{role.labelZh} · {role.labelEn}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
