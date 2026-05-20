import type { Case } from '../types'
import { CASE_COLOR_LABELS } from '../types'
import { CaseIntensityDot } from './CaseIntensityDot'
import { CaseStatusBadge } from './CaseStatusBadge'

interface CaseDetailHeaderProps {
  caseData: Case
  isManager: boolean
}

export function CaseDetailHeader({ caseData, isManager }: CaseDetailHeaderProps) {
  const intensityLabel = CASE_COLOR_LABELS[caseData.colorCode]

  return (
    <div className="case-detail-header">
      <div className="case-detail-title-row">
        <span className="case-detail-code">{caseData.caseNo}</span>
        <CaseStatusBadge status={caseData.status} />
        <span className="case-detail-intensity-label">
          <CaseIntensityDot colorCode={caseData.colorCode} />
          {intensityLabel.zh}
        </span>
      </div>

      <div className="case-detail-subtitle">
        {caseData.clientNameChn} / Ven. {caseData.clientNameEn}
        {caseData.tradition ? ` · ${caseData.tradition}` : ''}
        {caseData.socialWorker ? ` · 主责 / Caseworker: ${caseData.socialWorker}` : ''}
      </div>

      <div className="case-detail-actions">
        <button className="btn-secondary" type="button" onClick={() => alert('功能即将推出 / Coming soon')}>
          分配义工 · Assign Volunteer
        </button>
        <button className="btn-secondary" type="button" onClick={() => alert('功能即将推出 / Coming soon')}>
          更新状态 · Update Status
        </button>
        <button className="btn-edit" type="button" onClick={() => alert('功能即将推出 / Coming soon')}>
          编辑个案 · Edit Case
        </button>
        <button className="btn-audit" type="button" onClick={() => alert('功能即将推出 / Coming soon')}>
          标记个案 · Flag Case
        </button>
        {caseData.status !== 'CLOSED' ? (
          <button className="btn-danger" type="button" onClick={() => alert('功能即将推出 / Coming soon')}>
            关闭个案 · Close Case
          </button>
        ) : null}
      </div>

      {isManager ? (
        <div className="case-manager-banner">
          <span>⚙</span>
          <span>管理员视图 · Manager View — 审计选项卡已启用。Audit tab enabled.</span>
        </div>
      ) : null}
    </div>
  )
}
