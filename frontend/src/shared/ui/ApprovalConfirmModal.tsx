interface ApprovalConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  pending?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ApprovalConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  pending = false,
  onCancel,
  onConfirm,
}: ApprovalConfirmModalProps) {
  if (!open) return null

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
        <div className="approval-confirm-actions">
          <button className="btn-secondary" type="button" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn-primary" type="button" disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
