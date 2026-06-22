import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../contexts/AuthContext'
import { sendInviteSetupEmail } from '../../auth/api/auth'
import { getApiErrorCode } from '../../../shared/api'
import { useApprovalAssigneeOptions } from '../../../shared/approvals/useApprovalAssigneeOptions'
import { ApprovalConfirmModal, ErrorBanner, PageHeader, SectionCard, TableShell } from '../../../shared/ui'
import { inviteErrorKey } from '../inviteErrors'
import {
  useDeleteUser,
  useInviteUser,
  useUpdateUserRoles,
  useUpdateUserStatus,
  useUsers,
} from '../hooks'
import type { InviteUserPayload, UserRole, UserStatus, UserSummary } from '../types'
import './users.css'

const ROLE_VALUES: UserRole[] = ['MANAGER', 'SOCIAL_WORKER', 'VOLUNTEER']

const initialInviteForm: InviteUserPayload = {
  username: '',
  fullName: '',
  email: '',
  phone: '',
  roles: ['VOLUNTEER'],
}

function normalizeText(value: string | null | undefined, fallback = '-'): string {
  const text = value?.trim()
  return text || fallback
}

export function UsersPage() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const { data: users = [], isLoading, isError } = useUsers()
  const inviteUser = useInviteUser()
  const updateRoles = useUpdateUserRoles()
  const updateStatus = useUpdateUserStatus()
  const deleteUser = useDeleteUser()
  const approvalAssignees = useApprovalAssigneeOptions()
  const [search, setSearch] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteUserPayload>(initialInviteForm)
  const [editingUser, setEditingUser] = useState<UserSummary>()
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserSummary>()
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
      setFormError(t('users.error.roleRequired'))
      return
    }

    const email = inviteForm.email.trim()
    try {
      await inviteUser.mutateAsync({
        ...inviteForm,
        username: inviteForm.username?.trim() || undefined,
        fullName: inviteForm.fullName?.trim() || undefined,
        email,
        phone: inviteForm.phone?.trim() || undefined,
      })
    } catch (error) {
      setFormError(t(inviteErrorKey(getApiErrorCode(error))))
      return
    }

    // 账号已创建,触发 Firebase 发送"设置密码"邮件(失败不阻断,可让 MANAGER 重发邀请)
    try {
      await sendInviteSetupEmail(email)
    } catch {
      window.alert(t('users.error.inviteEmail'))
    }
    closeInviteModal()
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
      setFormError(t('users.error.roleRequired'))
      return
    }

    try {
      await updateRoles.mutateAsync({
        id: editingUser.id,
        data: { roles: editingRoles },
      })
      closeRoleEditor()
    } catch {
      setFormError(t('users.error.roles'))
    }
  }

  async function toggleStatus(user: UserSummary) {
    const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const confirmed = window.confirm(
      nextStatus === 'ACTIVE'
        ? t('users.confirm.activate', { name: user.fullName })
        : t('users.confirm.deactivate', { name: user.fullName }),
    )
    if (!confirmed) return

    try {
      await updateStatus.mutateAsync({ id: user.id, data: { status: nextStatus } })
    } catch {
      // Mutation error state renders the page-level banner.
    }
  }

  async function handleDelete(approverId?: number) {
    if (!deleteTargetUser) return
    try {
      await deleteUser.mutateAsync({ id: deleteTargetUser.id, approverId })
      setDeleteTargetUser(undefined)
    } catch {
      // Mutation error state renders the page-level banner.
    }
  }

  const actionError = updateStatus.isError || deleteUser.isError

  return (
    <div className="users-page">
      <PageHeader
        title={t('users.pageTitle')}
        actions={(
          <button className="users-primary-button" type="button" onClick={openInviteModal}>
            + {t('users.addBtn')}
          </button>
        )}
      />

      <section className="users-manager-banner" aria-label="Manager user management notice">
        <div>
          <strong>{t('users.managerView')}</strong>
          <span>{t('users.managerDesc')}</span>
        </div>
      </section>

      {isError ? <ErrorBanner message={t('users.error.load')} /> : null}
      {actionError ? <ErrorBanner message={t('users.error.action')} /> : null}

      <div className="users-toolbar">
        <input
          className="users-search-input"
          type="text"
          placeholder={t('users.search')}
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
                <th>{t('users.table.name')}</th>
                <th>{t('users.table.role')}</th>
                <th>{t('users.table.email')}</th>
                <th>{t('users.table.status')}</th>
                <th>{t('users.table.lastLogin')}</th>
                <th>{t('users.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="users-table-state" colSpan={6}>{t('users.table.loading')}</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td className="users-table-state" colSpan={6}>{t('users.table.empty')}</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser?.id

                  return (
                    <tr key={user.id}>
                      <td>
                        <span className="users-cell-strong">{normalizeText(user.fullName)}</span>
                        <span className="users-cell-muted">
                          @{normalizeText(user.username, 'username')}{isSelf ? ` · ${t('users.table.self')}` : ''}
                        </span>
                      </td>
                      <td>
                        <div className="users-role-stack">
                          {user.roles.map((role) => (
                            <span className={`users-role-badge users-role-${String(role).toLowerCase()}`} key={role}>
                              {t(`users.role.${role}`)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td><span className="users-cell-main">{normalizeText(user.email)}</span></td>
                      <td>
                        <span className={`users-status-badge users-status-${user.status.toLowerCase()}`}>
                          {t(`users.status.${user.status}`)}
                        </span>
                        {user.inviteStale ? (
                          <span className="users-invite-stale" title={t('users.invite.staleHint')}>
                            {t('users.invite.stale')}
                          </span>
                        ) : null}
                      </td>
                      <td><span className="users-cell-main">-</span></td>
                      <td>
                        <div className="users-row-actions">
                          <button
                            className="users-action-link"
                            type="button"
                            disabled={isSelf}
                            title={isSelf ? t('users.tooltip.selfEdit') : undefined}
                            onClick={() => openRoleEditor(user)}
                          >
                            {t('users.table.edit')}
                          </button>
                          <button
                            className="users-action-link users-action-warning"
                            type="button"
                            disabled={isSelf || updateStatus.isPending}
                            title={isSelf ? t('users.tooltip.selfDeactivate') : undefined}
                            onClick={() => void toggleStatus(user)}
                          >
                            {user.status === 'ACTIVE' ? t('users.table.deactivate') : t('users.table.activate')}
                          </button>
                          <button
                            className="users-action-link users-action-danger"
                            type="button"
                            disabled={isSelf || deleteUser.isPending}
                            title={isSelf ? t('users.tooltip.selfRemove') : undefined}
                            onClick={() => setDeleteTargetUser(user)}
                          >
                            {t('users.table.remove')}
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
        <SummaryCard titleKey="users.summary.total" value={users.length} />
        <SummaryCard titleKey="users.summary.active" value={activeUsers} />
        <SummaryCard titleKey="users.summary.volunteers" value={volunteers} />
      </div>

      {showInviteModal ? (
        <UserModal
          titleKey="users.modal.addTitle"
          error={formError}
          submitting={inviteUser.isPending}
          submitLabel={inviteUser.isPending ? t('users.modal.creating') : t('users.modal.createBtn')}
          onClose={closeInviteModal}
          onSubmit={submitInvite}
        >
          <UserTextField
            label={t('users.modal.username')}
            required
            value={inviteForm.username ?? ''}
            onChange={(value) => setInviteForm((current) => ({ ...current, username: value }))}
          />
          <UserTextField
            label={t('users.modal.fullName')}
            required
            value={inviteForm.fullName ?? ''}
            onChange={(value) => setInviteForm((current) => ({ ...current, fullName: value }))}
          />
          <UserTextField
            label={t('users.modal.email')}
            required
            type="email"
            value={inviteForm.email}
            onChange={(value) => setInviteForm((current) => ({ ...current, email: value }))}
          />
          <UserTextField
            label={t('users.modal.phone')}
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
          titleKey="users.modal.editTitle"
          titleSuffix={editingUser.fullName}
          error={formError}
          submitting={updateRoles.isPending}
          submitLabel={updateRoles.isPending ? t('users.modal.saving') : t('users.modal.saveBtn')}
          onClose={closeRoleEditor}
          onSubmit={submitRoleUpdate}
        >
          <RoleCheckboxGroup
            roles={editingRoles}
            onSelect={(role) => setEditingRoles([role])}
          />
        </UserModal>
      ) : null}

      <ApprovalConfirmModal
        open={deleteTargetUser !== undefined}
        title={t('approvalConfirm.title')}
        message={deleteTargetUser ? t('users.confirm.delete', { name: deleteTargetUser.fullName }) : ''}
        confirmLabel={deleteUser.isPending ? t('common.saving') : t('approvalConfirm.confirm')}
        cancelLabel={t('approvalConfirm.cancel')}
        pending={deleteUser.isPending}
        approverOptions={approvalAssignees.options}
        approverRequired
        approverLoading={approvalAssignees.isLoading}
        onCancel={() => setDeleteTargetUser(undefined)}
        onConfirm={(approverId) => void handleDelete(approverId)}
      />
    </div>
  )
}

function SummaryCard({ titleKey, value }: { titleKey: string; value: number }) {
  const { t } = useTranslation()
  return (
    <div className="users-summary-card">
      <span>{t(titleKey)}</span>
      <strong>{value}</strong>
    </div>
  )
}

interface UserModalProps {
  titleKey: string
  titleSuffix?: string
  error?: string
  submitting: boolean
  submitLabel: string
  children: React.ReactNode
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function UserModal({
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
