import { useTranslation } from 'react-i18next'
import type { Case } from '../types'
import { CASE_COLOR_KEYS } from '../types'
import { CaseIntensityDot } from './CaseIntensityDot'
import { CaseStatusBadge } from './CaseStatusBadge'

interface CaseDetailHeaderProps {
  caseData: Case
  isManager: boolean
}

export function CaseDetailHeader({ caseData, isManager }: CaseDetailHeaderProps) {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'

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
        {isZh ? caseData.clientNameChn : caseData.clientNameEn}
        {' / Ven. '}{caseData.clientNameEn}
        {caseData.tradition ? ` · ${caseData.tradition}` : ''}
        {caseData.socialWorker ? ` · ${t('cases.overview.caseworker')}: ${caseData.socialWorker}` : ''}
      </div>

      <div className="case-detail-actions">
        <button className="btn-edit" type="button" onClick={() => alert(t('common.comingSoon'))}>
          {t('clients.profile.editProfile')}
        </button>
        <button className="btn-audit" type="button" onClick={() => alert(t('common.comingSoon'))}>
          {t('cases.audit.flags.flagCase')}
        </button>
      </div>

      {isManager ? (
        <div className="case-manager-banner">
          <span>⚙</span>
          <span>{t('users.managerView')} — {t('cases.tab.audit')}</span>
        </div>
      ) : null}
    </div>
  )
}
