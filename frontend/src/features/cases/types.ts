export type CaseStatus = 'OPEN' | 'SUSPENDED' | 'CLOSED'

export type CaseColorCode = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'GREY' | 'BLACK'

export const CASE_COLOR_LABELS: Record<CaseColorCode, { zh: string; en: string }> = {
  RED: { zh: '红色 · 迫切护理需求', en: 'Red · Critical Care Needed' },
  ORANGE: { zh: '橙色 · 高度关注', en: 'Orange · High Attention' },
  YELLOW: { zh: '黄色 · 定期跟进', en: 'Yellow · Regular Follow-up' },
  GREEN: { zh: '绿色 · 情况稳定', en: 'Green · Stable' },
  GREY: { zh: '灰色 · 低度活跃', en: 'Grey · Low Activity' },
  BLACK: { zh: '黑色 · 已关闭', en: 'Black · Closed' },
}

export interface CaseTask {
  id: string
  caseId: string
  titleZh: string
  titleEn: string
  dueDate: string
  completed: boolean
  completedAt?: string
}

export const CASE_SERVICE_LABELS: Record<keyof CaseServices, { zh: string; en: string; group: string }> = {
  housingSupport:       { zh: '住房援助', en: 'Housing Support', group: 'practical' },
  financialAssistance:  { zh: '财务援助', en: 'Financial Assistance', group: 'practical' },
  medicalTransportation:{ zh: '医疗交通', en: 'Medical Transportation', group: 'practical' },
  foodAssistance:       { zh: '食物援助', en: 'Food Assistance', group: 'practical' },
  legalAid:             { zh: '法律援助', en: 'Legal Aid', group: 'practical' },
  immigrationSupport:   { zh: '移民支持', en: 'Immigration Support', group: 'practical' },
  counselling:          { zh: '辅导服务', en: 'Counselling', group: 'emotional' },
  befriending:          { zh: '陪伴服务', en: 'Befriending', group: 'emotional' },
  crisisIntervention:   { zh: '危机干预', en: 'Crisis Intervention', group: 'emotional' },
  familyMediation:      { zh: '家庭调解', en: 'Family Mediation', group: 'emotional' },
  governmentLiaison:    { zh: '政府联络', en: 'Government Liaison', group: 'admin' },
  hospitalLiaison:      { zh: '医院联络', en: 'Hospital Liaison', group: 'admin' },
  documentAssistance:   { zh: '文件协助', en: 'Document Assistance', group: 'admin' },
  interpreterService:   { zh: '口译服务', en: 'Interpreter Service', group: 'admin' },
  templeLiaison:        { zh: '寺院联络', en: 'Temple Liaison', group: 'spiritual' },
  communityReferral:    { zh: '社区转介', en: 'Community Referral', group: 'spiritual' },
  religiousSupport:     { zh: '宗教支持', en: 'Religious Support', group: 'spiritual' },
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
  assignedVolunteer?: string
  lastModifiedAt?: string
  lastModifiedBy?: string
  status: CaseStatus
  colorCode: CaseColorCode
  comments: string
  remarks: string
  services: CaseServices
  tasks?: CaseTask[]
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
