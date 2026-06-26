import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ApprovalConfirmApproverOption {
  id: number
  label: string
}

interface ApprovalConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  pending?: boolean
  error?: string
  approverOptions?: ApprovalConfirmApproverOption[]
  approverRequired?: boolean
  approverLoading?: boolean
  onCancel: () => void
  onConfirm: (approverId?: number, reason?: string) => void
}

export function ApprovalConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  pending = false,
  error,
  approverOptions,
  approverRequired = false,
  approverLoading = false,
  onCancel,
  onConfirm,
}: ApprovalConfirmModalProps) {
  const { t } = useTranslation()
  const [selectedApproverId, setSelectedApproverId] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setSelectedApproverId('')
      setReason('')
    }
  }, [open])

  if (!open) return null

  const showApproverSelect = approverRequired || approverOptions !== undefined
  const confirmDisabled = pending || (approverRequired && !selectedApproverId) || !reason.trim()

  return (
    <div className="approval-confirm-backdrop" role="presentation" onMouseDown={pending ? undefined : onCancel}>
      <div
        className="approval-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-confirm-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="approval-confirm-icon">!</div>
        <div className="approval-confirm-copy">
          <h2 id="approval-confirm-title">{title}</h2>
          <p>{message}</p>
        </div>
        {showApproverSelect ? (
          <label className="approval-confirm-approver">
            <span>{t('approvalConfirm.approver')}</span>
            <select
              value={selectedApproverId}
              disabled={pending || approverLoading || (approverOptions ?? []).length === 0}
              onChange={(event) => setSelectedApproverId(event.target.value)}
            >
              <option value="">
                {approverLoading
                  ? t('approvalConfirm.loadingApprovers')
                  : t('approvalConfirm.selectApprover')}
              </option>
              {(approverOptions ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {!approverLoading && (approverOptions ?? []).length === 0 ? (
              <small>{t('approvalConfirm.noApprovers')}</small>
            ) : null}
          </label>
        ) : null}
        <label className="approval-confirm-reason">
          <span>{t('approvalConfirm.reason')}</span>
          <textarea
            value={reason}
            rows={3}
            disabled={pending}
            placeholder={t('approvalConfirm.reasonPlaceholder')}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {error ? <div className="approval-confirm-error">{error}</div> : null}
        <div className="approval-confirm-actions">
          <button className="btn-secondary" type="button" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className="btn-primary"
            type="button"
            disabled={confirmDisabled}
            onClick={() => onConfirm(selectedApproverId ? Number(selectedApproverId) : undefined, reason.trim())}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
