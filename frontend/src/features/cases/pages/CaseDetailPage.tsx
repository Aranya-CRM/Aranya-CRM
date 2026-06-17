import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useAccess } from '../../../shared/auth'
import { ApprovalConfirmModal, BackButton } from '../../../shared/ui'
import { CaseDetailHeader, CaseDetailTabs } from '../components'
import { useCaseAuditLog, useCaseFlags, useCase, useCaseNotes, useDeleteCase } from '../hooks'
import './cases.css'

export function CaseDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { resolve } = useAccess()

  const { data: caseData, isLoading } = useCase(id)
  const { data: notes = [] } = useCaseNotes(id)
  const { data: auditLog = [] } = useCaseAuditLog(id)
  const { data: flags = [] } = useCaseFlags(id)
  const deleteCase = useDeleteCase()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isManager = resolve('cases:audit')
  const canDeleteCase = resolve('cases:delete')

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
        {canDeleteCase ? (
          <div className="case-detail-top-actions">
            <button className="btn-danger" type="button" onClick={() => setShowDeleteConfirm(true)}>
              {t('cases.detail.delete')}
            </button>
          </div>
        ) : null}
        <CaseDetailHeader caseData={caseData} />
        <CaseDetailTabs caseData={caseData} notes={notes} auditLog={auditLog} flags={flags} isManager={isManager} />
      </div>

      <ApprovalConfirmModal
        open={showDeleteConfirm}
        title={t('approvalConfirm.title')}
        message={t('approvalConfirm.caseDelete')}
        confirmLabel={deleteCase.isPending ? t('common.saving') : t('approvalConfirm.confirm')}
        cancelLabel={t('approvalConfirm.cancel')}
        pending={deleteCase.isPending}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          if (!caseData) return
          await deleteCase.mutateAsync(caseData.id)
          setShowDeleteConfirm(false)
          navigate('/cases')
        }}
      />
    </div>
  )
}
