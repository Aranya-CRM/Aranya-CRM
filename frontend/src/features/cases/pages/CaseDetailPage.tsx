import { useNavigate, useParams } from 'react-router-dom'
import { useAccess } from '../../../shared/auth'
import { BackButton } from '../../../shared/ui'
import { CaseDetailHeader, CaseDetailTabs } from '../components'
import { useCase, useCaseNotes } from '../hooks'
import './cases.css'

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canFeature } = useAccess()

  const { data: caseData, isLoading } = useCase(id)
  const { data: notes = [] } = useCaseNotes(id)

  const isManager = canFeature('cases.audit')

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
      <BackButton onClick={() => navigate('/cases')}>
        ← 返回个案列表 · Back to Cases
      </BackButton>

      <div className="case-detail-card">
        <CaseDetailHeader caseData={caseData} isManager={isManager} />
        <CaseDetailTabs caseData={caseData} notes={notes} isManager={isManager} />
      </div>
    </div>
  )
}
