import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Case } from '../types'
import { CASE_COLOR_KEYS } from '../types'
import { CaseIntensityDot } from './CaseIntensityDot'
import { CaseStatusBadge } from './CaseStatusBadge'

interface CaseDetailHeaderProps {
  caseData: Case
  actions?: ReactNode
}

export function CaseDetailHeader({ caseData, actions }: CaseDetailHeaderProps) {
  const { t } = useTranslation()
  const title = caseData.clientAbbr || caseData.clientNameEn || caseData.clientNameChn

  return (
    <div className="case-detail-header">
      <div className="case-detail-header-main">
        <div className="case-detail-heading">
          <div className="case-detail-title-row">
            <span className="case-detail-code">{title}</span>
            <CaseStatusBadge status={caseData.status} />
            <span className="case-detail-intensity-label">
              <CaseIntensityDot colorCode={caseData.colorCode} />
              {t(CASE_COLOR_KEYS[caseData.colorCode])}
            </span>
          </div>

          <div className="case-detail-subtitle">
            {caseData.caseNo}
          </div>
        </div>

        {actions ? <div className="case-detail-header-actions">{actions}</div> : null}
      </div>
    </div>
  )
}
