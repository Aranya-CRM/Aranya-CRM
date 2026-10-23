import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../contexts/AuthContext'
import { getApiErrorCode } from '../../../shared/api'
import { ErrorBanner, SectionCard, TableShell } from '../../../shared/ui'
import { RoleCheckboxGroup, UserModal } from './UserModal'
import { InviteUserModal } from './InviteUserModal'
import type { UserRole, UserStatus, UserSummary } from '../types'
import {
  useAdminUsers,
  useDeleteUser,
  useResendInvite,
  useUpdateUserRoles,
  useUpdateUserStatus,
} from '../hooks/useAdminUsers'
import '../pages/users.css'

function normalizeText(value: string | null | undefined, fallback = '-'): string {
  const text = value?.trim()
  return text || fallback
}

/** Settings「账号管理」分区(用户列表 / 邀请 / 重发邀请 / 角色 / 状态 / 删除)。 */
export function AccountManagementSection() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const { data: users = [], isLoading, isError } = useAdminUsers()
  const updateRoles = useUpdateUserRoles()
  const updateStatus = useUpdateUserStatus()
  const deleteUser = useDeleteUser()
  const resendInvite = useResendInvite()
  const [search, setSearch] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserSummary>()
  const [editingRoles, setEditingRoles] = useState<UserRole[]>([])
  const [formError, setFormError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [noticeIsError, setNoticeIsError] = useState(false)

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((user) => (
      user.fullName.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.roles.some((role) => String(role).toLowerCase().includes(q))
    ))
  }, [search, users])

  const activeUsers = useMemo(() => users.filter((u) => u.status === 'ACTIVE').length, [users])
  const invitedUsers = useMemo(() => users.filter((u) => u.status === 'INVITED').length, [users])

  function showNotice(text: string, error = false) {
    setNoticeIsError(error)
    setNotice(text)
  }

  async function handleResend(user: UserSummary) {
    try {
      await resendInvite.mutateAsync(user.id)
      showNotice(t('users.invite.resent', { name: user.fullName }))
    } catch (error) {
      const code = getApiErrorCode(error)
      showNotice(
        t(code === 'NOT_INVITED' ? 'users.error.notInvited' : 'users.error.action'),
        true,
      )
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
      setFormError(t('users.error.roleRequired'))
      return
    }
    try {
      await updateRoles.mutateAsync({ id: editingUser.id, data: { roles: editingRoles } })
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
      // Mutation error state renders the section-level banner.
    }
  }

  async function handleDelete(user: UserSummary) {
    const confirmed = window.confirm(t('users.confirm.delete', { name: user.fullName }))
    if (!confirmed) return
    try {
      await deleteUser.mutateAsync(user.id)
    } catch {
      // Mutation error state renders the section-level banner.
    }
  }

  const actionError = updateStatus.isError || deleteUser.isError

  return (
    <div className="users-page">
      <div className="admin-section-header">
        <div>
          <h2>{t('users.page.title')}</h2>
          <p>{t('users.page.subtitle')}</p>
        </div>
        <button className="users-primary-button" type="button" onClick={() => setShowInviteModal(true)}>
          + {t('users.addBtn')}
        </button>
      </div>

      {isError ? <ErrorBanner message={t('users.error.load')} /> : null}
      {actionError ? <ErrorBanner message={t('users.error.action')} /> : null}
      {notice ? (
        <div className={'users-action-notice' + (noticeIsError ? ' users-action-notice-error' : '')}>
          {notice}
        </div>
      ) : null}

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
              <col className="col-user-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>{t('users.table.name')}</th>
                <th>{t('users.table.role')}</th>
                <th>{t('users.table.email')}</th>
                <th>{t('users.table.status')}</th>
                <th>{t('users.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="users-table-state" colSpan={5}>{t('users.table.loading')}</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td className="users-table-state" colSpan={5}>{t('users.table.empty')}</td></tr>
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
                        {user.status === 'INVITED' && user.invitedAt ? (
                          <span className="users-invite-meta">
                            {t('users.invite.sentAt', { date: user.invitedAt.slice(0, 10) })}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <div className="users-row-actions">
                          {user.status === 'INVITED' ? (
                            <button
                              className="users-action-link"
                              type="button"
                              disabled={resendInvite.isPending}
                              onClick={() => void handleResend(user)}
                            >
                              {t('users.invite.resend')}
                            </button>
                          ) : null}
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
                            onClick={() => void handleDelete(user)}
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
        <SummaryCard titleKey="users.summary.invited" value={invitedUsers} />
      </div>

      <InviteUserModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvited={(email) => showNotice(t('users.invite.sent', { email }))}
      />

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
          <RoleCheckboxGroup roles={editingRoles} onSelect={(role) => setEditingRoles([role])} />
        </UserModal>
      ) : null}
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
