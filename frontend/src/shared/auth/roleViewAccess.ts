import { useMemo } from 'react'
import { useAccess } from './useAccess'

export const ROUTE_CAPABILITIES = {
  dashboard: 'dashboard',
  membersList: 'clients.list',
  casesList: 'cases.list',
  reportsList: 'reports.list',
} as const

export const FEATURE_CAPABILITIES = {
  viewBasicMemberProfile: 'clients.view.basic',
  viewFullMemberProfile: 'clients.view.full',
  createReport: 'reports.create',
  viewOwnReports: 'reports.view.own',
  viewAllReports: 'reports.view.all',
  viewCases: 'cases.view',
  createCaseNote: 'cases.notes.create',
  viewCaseAudit: 'cases.audit',
  uploadCaseDocument: 'cases.documents.uploadEdit',
  deleteCaseDocument: 'cases.documents.delete',
} as const

export function useRoleViewAccess() {
  const { canFeature, canRoute } = useAccess()

  return useMemo(() => {
    const canAccessCaseModule = canRoute(ROUTE_CAPABILITIES.casesList)
    const canAccessReportModule = canRoute(ROUTE_CAPABILITIES.reportsList)
    const canViewFullMemberProfile = canFeature(FEATURE_CAPABILITIES.viewFullMemberProfile)
    const canViewPartialMemberProfile =
      canFeature(FEATURE_CAPABILITIES.viewBasicMemberProfile) || canViewFullMemberProfile

    return {
      canAccessCaseModule,
      canAccessReportModule,
      canSubmitReport: canFeature(FEATURE_CAPABILITIES.createReport),
      canViewOwnReports: canFeature(FEATURE_CAPABILITIES.viewOwnReports),
      canViewAllReports: canFeature(FEATURE_CAPABILITIES.viewAllReports),
      canViewPartialMemberProfile,
      canViewFullMemberProfile,
      canCreateCaseNote: canFeature(FEATURE_CAPABILITIES.createCaseNote),
      canViewCaseAudit: canFeature(FEATURE_CAPABILITIES.viewCaseAudit),
      canUploadCaseDocument: canFeature(FEATURE_CAPABILITIES.uploadCaseDocument),
      canDeleteCaseDocument: canFeature(FEATURE_CAPABILITIES.deleteCaseDocument),
    }
  }, [canFeature, canRoute])
}
