export type CaseStatus = 'OPEN' | 'SUSPENDED' | 'CLOSED'

export type CaseColorCode = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'GREY' | 'BLACK'

export const CASE_COLOR_LABELS: Record<CaseColorCode, { zh: string; en: string }> = {
  RED: { zh: '紧急', en: 'Critical' },
  ORANGE: { zh: '高风险', en: 'High Risk' },
  YELLOW: { zh: '中等', en: 'Moderate' },
  GREEN: { zh: '稳定', en: 'Stable' },
  GREY: { zh: '低活跃', en: 'Low Activity' },
  BLACK: { zh: '已关闭', en: 'Closed' },
}

export interface CaseServices {
  // Practical support
  housingSupport: boolean
  financialAssistance: boolean
  medicalTransportation: boolean
  foodAssistance: boolean
  legalAid: boolean
  immigrationSupport: boolean
  // Emotional / social
  counselling: boolean
  befriending: boolean
  crisisIntervention: boolean
  familyMediation: boolean
  // Administrative
  governmentLiaison: boolean
  hospitalLiaison: boolean
  documentAssistance: boolean
  interpreterService: boolean
  // Spiritual / community
  templeLiaison: boolean
  communityReferral: boolean
  religiousSupport: boolean
}

export interface Case {
  id: string
  caseNo: string
  dateOpened: string
  closedAt?: string
  clientId: string
  clientNameEn: string
  clientNameChn: string
  tradition: string
  socialWorker: string
  status: CaseStatus
  colorCode: CaseColorCode
  comments: string
  remarks: string
  services: CaseServices
}

export interface CaseNote {
  id: string
  caseId: string
  date: string
  content: string
  followUp: string
  recordedBy: string
  createdAt: string
}

export interface CaseStatusChange {
  id: string
  caseId: string
  fromStatus: CaseStatus
  toStatus: CaseStatus
  changedBy: string
  changedAt: string
  reason: string
}
