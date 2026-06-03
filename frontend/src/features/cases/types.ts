export type CaseStatus = 'OPEN' | 'SUSPENDED' | 'CLOSED'

export type CaseColorCode = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'GREY' | 'BLACK'

export const CASE_COLOR_KEYS: Record<CaseColorCode, string> = {
  RED: 'cases.color.RED',
  ORANGE: 'cases.color.ORANGE',
  YELLOW: 'cases.color.YELLOW',
  GREEN: 'cases.color.GREEN',
  GREY: 'cases.color.GREY',
  BLACK: 'cases.color.BLACK',
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

export const CASE_SERVICE_GROUPS: Record<keyof CaseServices, string> = {
  accommodationArrangement: 'housing',
  deepCleaning:             'housing',
  relocationAssistance:     'housing',
  dailyCleaning:            'housing',
  pestControl:              'housing',
  homeRepair:               'housing',
  dailyExpenseSubsidy:      'financial',
  cpfAssistance:            'financial',
  mealDelivery:             'food',
  lunchSupport:             'food',
  monasticSupport:          'other',
  monasticEscort:           'other',
  legalAid:                 'other',
  volunteerVisit:           'other',
  digitalSupport:           'other',
}

export interface CaseServices {
  // Housing & accommodation
  accommodationArrangement: boolean
  deepCleaning: boolean
  relocationAssistance: boolean
  dailyCleaning: boolean
  pestControl: boolean
  homeRepair: boolean
  // Financial aid
  dailyExpenseSubsidy: boolean
  cpfAssistance: boolean
  // Food assistance
  mealDelivery: boolean
  lunchSupport: boolean
  // Other services
  monasticSupport: boolean
  monasticEscort: boolean
  legalAid: boolean
  volunteerVisit: boolean
  digitalSupport: boolean
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

export type AuditLogAction =
  | 'CASE_CREATED'
  | 'CASE_CLOSED'
  | 'CASE_REOPENED'
  | 'STATUS_CHANGED'
  | 'INTENSITY_CHANGED'
  | 'NOTE_ADDED'
  | 'TASK_COMPLETED'
  | 'TASK_ADDED'
  | 'CASEWORKER_ASSIGNED'
  | 'VOLUNTEER_ASSIGNED'
  | 'SERVICE_UPDATED'
  | 'CASE_FLAGGED'
  | 'FLAG_RESOLVED'

export interface AuditLogEntry {
  id: string
  caseId: string
  action: AuditLogAction
  actor: string
  at: string
  detail?: string
  meta?: Record<string, string>
}

export interface ServiceCalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  color?: string
  extendedProps?: {
    serviceType?: keyof CaseServices
    note?: string
  }
}

export type FlagSeverity = 'LOW' | 'MEDIUM' | 'HIGH'
export type FlagStatus = 'OPEN' | 'RESOLVED'

export interface CaseFlag {
  id: string
  caseId: string
  severity: FlagSeverity
  status: FlagStatus
  reason: string
  flaggedBy: string
  flaggedAt: string
  resolvedBy?: string
  resolvedAt?: string
  resolution?: string
}
