import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { sendInviteSetupEmail } from '../../auth/api/auth'
import { getApiErrorCode } from '../../../shared/api'
import { inviteErrorKey } from '../../users/inviteErrors'
import { RoleCheckboxGroup, UserModal, UserTextField } from '../../users/components/UserModal'
import type { InviteUserPayload } from '../../users/types'
import { useInviteUser } from '../hooks/useAdminUsers'

const initialInviteForm: InviteUserPayload = {
  username: '',
  fullName: '',
  email: '',
  phone: '',
  roles: ['VOLUNTEER'],
}

interface InviteUserModalProps {
  open: boolean
  onClose: () => void
  /** 邀请成功后回调(可选) */
  onInvited?: () => void
}

/** Admin Dashboard「邀请用户」弹窗,自含表单状态、提交与 Firebase 设密码邮件逻辑。 */
export function InviteUserModal({ open, onClose, onInvited }: InviteUserModalProps) {
  const { t } = useTranslation()
  const inviteUser = useInviteUser()
  const [form, setForm] = useState<InviteUserPayload>(initialInviteForm)
  const [formError, setFormError] = useState<string>()

  function handleClose() {
    if (inviteUser.isPending) return
    setForm(initialInviteForm)
    setFormError(undefined)
    onClose()
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(undefined)

    if (form.roles.length === 0) {
      setFormError(t('users.error.roleRequired'))
      return
    }

    const email = form.email.trim()
    try {
      await inviteUser.mutateAsync({
        ...form,
        username: form.username?.trim() || undefined,
        fullName: form.fullName?.trim() || undefined,
        email,
        phone: form.phone?.trim() || undefined,
      })
    } catch (error) {
      setFormError(t(inviteErrorKey(getApiErrorCode(error))))
      return
    }

    // 账号已创建,触发 Firebase 发送"设置密码"邮件(失败不阻断)
    try {
      await sendInviteSetupEmail(email)
    } catch {
      window.alert(t('users.error.inviteEmail'))
    }
    setForm(initialInviteForm)
    onInvited?.()
    onClose()
  }

  if (!open) return null

  return (
    <UserModal
      titleKey="users.modal.addTitle"
      error={formError}
      submitting={inviteUser.isPending}
      submitLabel={inviteUser.isPending ? t('users.modal.creating') : t('users.modal.createBtn')}
      onClose={handleClose}
      onSubmit={submitInvite}
    >
      <UserTextField
        label={t('users.modal.username')}
        required
        value={form.username ?? ''}
        onChange={(value) => setForm((current) => ({ ...current, username: value }))}
      />
      <UserTextField
        label={t('users.modal.fullName')}
        required
        value={form.fullName ?? ''}
        onChange={(value) => setForm((current) => ({ ...current, fullName: value }))}
      />
      <UserTextField
        label={t('users.modal.email')}
        required
        type="email"
        value={form.email}
        onChange={(value) => setForm((current) => ({ ...current, email: value }))}
      />
      <UserTextField
        label={t('users.modal.phone')}
        value={form.phone ?? ''}
        onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
      />
      <RoleCheckboxGroup
        roles={form.roles}
        onSelect={(role) => setForm((current) => ({ ...current, roles: [role] }))}
      />
    </UserModal>
  )
}
