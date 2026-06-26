import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { useAccess } from '../../../shared/auth'
import { addLocalPendingApproval, removeLocalPendingApproval, useLocalPendingApprovals } from '../../../shared/approvals/localPendingApprovals'
import { useApprovalAssigneeOptions } from '../../../shared/approvals/useApprovalAssigneeOptions'
import { ApprovalConfirmModal, BackButton } from '../../../shared/ui'
import { useApproveRequest, usePendingApprovals, useRejectRequest } from '../../approvals/api/approval.api'
import { CaseDetailHeader, CaseDetailTabs } from '../components'
import { useCaseAuditLog, useCaseFlags, useCase, useCaseNotes, useDeleteCase } from '../hooks'
import { mergePendingCaseApprovals, staleLocalCaseApprovalIds } from './caseApprovalUtils'
import './cases.css'

interface CaseApprovalView {
  id: number
  type: string
  targetId?: number | string | null
  targetLabel?: string | null
  payloadJson?: string | null
  requestedById?: number | null
  requestedByName?: string | null
  assignedApproverId?: number | null
  createdAt?: string | null
}

export function CaseDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { resolve } = useAccess()
  const { user } = useAuth()

  const { data: caseData, isLoading } = useCase(id)
  const { data: notes = [] } = useCaseNotes(id)
  const { data: auditLog = [] } = useCaseAuditLog(id)
  const { data: flags = [] } = useCaseFlags(id)
  const pendingCaseApprovals = useLocalPendingApprovals('CASE', id)
  const { data: pendingApprovals = [], dataUpdatedAt: pendingApprovalsUpdatedAt } = usePendingApprovals()
  const approveRequest = useApproveRequest()
  const rejectRequest = useRejectRequest()
  const approvalAssignees = useApprovalAssigneeOptions()
  const deleteCase = useDeleteCase()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isManager = resolve('cases:audit')
  const canDeleteCase = resolve('cases:delete')
  const serverCloseApprovals = useMemo(() => (
    pendingApprovals.filter((approval) => (
      approval.type === 'DELETE_CASE' && String(approval.targetId) === String(id)
    ))
  ), [id, pendingApprovals])
  const closeApprovalItems = useMemo(() => (
    mergePendingCaseApprovals(serverCloseApprovals, pendingCaseApprovals, pendingApprovalsUpdatedAt)
      .filter((approval) => approval.type === 'DELETE_CASE')
  ), [pendingApprovalsUpdatedAt, pendingCaseApprovals, serverCloseApprovals])
  const serverCloseApproval = serverCloseApprovals[0]
  const closeApproval = closeApprovalItems[0]
  const closeApprovalPending = Boolean(closeApproval)

  useEffect(() => {
    if (pendingApprovalsUpdatedAt <= 0) return
    staleLocalCaseApprovalIds(serverCloseApprovals, pendingCaseApprovals, pendingApprovalsUpdatedAt).forEach(removeLocalPendingApproval)
  }, [pendingApprovalsUpdatedAt, pendingCaseApprovals, serverCloseApprovals])

  if (isLoading) {
    return (
      <div className="case-detail-page">
        <div className="case-detail-card">
          <p className="case-placeholder-text">加载中... / Loading...</p>
        </div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="case-detail-page">
        <div className="case-detail-card">
          <p className="case-placeholder-text">未找到该个案 / Case not found.</p>
          <button
            className="btn-secondary"
            type="button"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/cases')}
          >
            ← 返回列表 / Back to List
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="case-detail-page">
      <BackButton onClick={() => navigate('/cases')} />

      <div className="case-detail-card">
        <CaseDetailHeader
          caseData={caseData}
          actions={closeApproval && canDecideApproval(serverCloseApproval, user?.id) ? (
            <>
              <button
                className="btn-secondary"
                type="button"
                disabled={rejectRequest.isPending || approveRequest.isPending}
                onClick={() => void rejectRequest.mutateAsync({ id: closeApproval.id, data: {} })}
              >
                {t('approvals.reject')}
              </button>
              <button
                className="btn-primary"
                type="button"
                disabled={rejectRequest.isPending || approveRequest.isPending}
                onClick={() => void approveRequest.mutateAsync({ id: closeApproval.id, data: {} })}
              >
                {t('approvals.approve')}
              </button>
            </>
          ) : canDeleteCase ? (
            <button
              className="btn-danger"
              type="button"
              disabled={closeApprovalPending}
              onClick={() => setShowDeleteConfirm(true)}
            >
              {closeApprovalPending ? t('cases.detail.closePending') : t('cases.detail.delete')}
            </button>
          ) : null}
        />
        {closeApproval ? (
          <CaseCloseApprovalBanner approval={closeApproval} />
        ) : null}
        <CaseDetailTabs caseData={caseData} notes={notes} auditLog={auditLog} flags={flags} isManager={isManager} />
      </div>

      <ApprovalConfirmModal
        open={showDeleteConfirm}
        title={t('approvalConfirm.title')}
        message={t('approvalConfirm.caseDelete')}
        confirmLabel={deleteCase.isPending ? t('common.saving') : t('approvalConfirm.confirm')}
        cancelLabel={t('approvalConfirm.cancel')}
        pending={deleteCase.isPending}
        approverOptions={approvalAssignees.options}
        approverRequired
        approverLoading={approvalAssignees.isLoading}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async (approverId, reason) => {
          if (!caseData) return
          const approval = await deleteCase.mutateAsync({ id: caseData.id, approverId, reason })
          addLocalPendingApproval({
            ...approval,
            targetType: approval.targetType ?? 'CASE',
            targetId: approval.targetId ?? caseData.id,
            targetLabel: approval.targetLabel ?? caseData.caseNo,
          })
          setShowDeleteConfirm(false)
        }}
      />
    </div>
  )
}

function CaseCloseApprovalBanner({ approval }: { approval: CaseApprovalView }) {
  const { t } = useTranslation()
  const payload = parseApprovalPayload(approval.payloadJson)
  return (
    <div className="case-detail-approval-banner">
      <div>
        <strong>{t('cases.approvals.closeCase')}</strong>
        <span>{approval.requestedByName ?? '-'} · {formatDateTime(approval.createdAt)}</span>
      </div>
      <span className="case-approval-badge close">{t('cases.approvals.badge.close')}</span>
      <details className="case-approval-reason">
        <summary>{t('cases.approvals.reason')}</summary>
        <p>{approvalReason(payload) || t('cases.approvals.noReason')}</p>
      </details>
    </div>
  )
}

function canDecideApproval(approval: CaseApprovalView | undefined, currentUserId: number | undefined) {
  if (!approval || currentUserId === undefined) return false
  if (approval.requestedById === currentUserId) return false
  return approval.assignedApproverId == null || approval.assignedApproverId === currentUserId
}

function parseApprovalPayload(payloadJson?: string | null): Record<string, unknown> {
  if (!payloadJson) return {}
  try {
    const parsed = JSON.parse(payloadJson)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function approvalReason(payload: Record<string, unknown>): string {
  const meta = payload._approval
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return ''
  const reason = (meta as Record<string, unknown>).reason
  return typeof reason === 'string' ? reason.trim() : ''
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
