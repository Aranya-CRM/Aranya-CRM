import { useMemo } from 'react'
import { useAccess } from './useAccess'

export const ROUTE_CAPABILITIES = {
  dashboard: 'route:dashboard',
  membersList: 'route:clients',
  casesList: 'route:cases',
  reportsList: 'route:reports',
} as const

export const FEATURE_CAPABILITIES = {
  viewBasicMemberProfile: 'clients:view',
  viewFullMemberProfile: 'clients:view.full',
  createReport: 'reports:create',
  viewOwnReports: 'reports:view',
  viewAllReports: 'reports:view',
  viewCases: 'cases:view',
  createCaseNote: 'cases:notes.create',
  viewCaseAudit: 'cases:audit',
  uploadCaseDocument: 'cases:documents.upload',
  deleteCaseDocument: 'cases:documents.delete',
} as const

export function useRoleViewAccess() {
  const { resolve } = useAccess()

  return useMemo(() => {
    const canAccessCaseModule = resolve(ROUTE_CAPABILITIES.casesList)
    const canAccessReportModule = resolve(ROUTE_CAPABILITIES.reportsList)
    const canViewFullMemberProfile = resolve(FEATURE_CAPABILITIES.viewFullMemberProfile)
    const canViewPartialMemberProfile =
      resolve(FEATURE_CAPABILITIES.viewBasicMemberProfile) || canViewFullMemberProfile

    return {
      canAccessCaseModule,
      canAccessReportModule,
      canSubmitReport: resolve(FEATURE_CAPABILITIES.createReport),
      canViewOwnReports: resolve(FEATURE_CAPABILITIES.viewOwnReports),
      canViewAllReports: resolve(FEATURE_CAPABILITIES.viewAllReports),
      canViewPartialMemberProfile,
      canViewFullMemberProfile,
      canCreateCaseNote: resolve(FEATURE_CAPABILITIES.createCaseNote),
      canViewCaseAudit: resolve(FEATURE_CAPABILITIES.viewCaseAudit),
      canUploadCaseDocument: resolve(FEATURE_CAPABILITIES.uploadCaseDocument),
      canDeleteCaseDocument: resolve(FEATURE_CAPABILITIES.deleteCaseDocument),
    }
  }, [resolve])
}
