import { useTranslation } from 'react-i18next'
import type { Case } from '../types'
import { CASE_COLOR_KEYS } from '../types'
import { CaseIntensityDot } from './CaseIntensityDot'
import { CaseStatusBadge } from './CaseStatusBadge'

interface CaseDetailHeaderProps {
  caseData: Case
}

export function CaseDetailHeader({ caseData }: CaseDetailHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="case-detail-header">
      <div className="case-detail-title-row">
        <span className="case-detail-code">{caseData.caseNo}</span>
        <CaseStatusBadge status={caseData.status} />
        <span className="case-detail-intensity-label">
          <CaseIntensityDot colorCode={caseData.colorCode} />
          {t(CASE_COLOR_KEYS[caseData.colorCode])}
        </span>
      </div>

      <div className="case-detail-subtitle">
        {caseData.clientAbbr || caseData.clientNameEn || caseData.clientNameChn}
      </div>
    </div>
  )
}
