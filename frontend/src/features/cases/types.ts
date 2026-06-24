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

export interface ServiceEvent {
  id: number
  caseId: number
  clientId: number
  clientAbbr?: string | null
  clientNameEn?: string | null
  clientNameChn?: string | null
  caseCode?: string | null
  serviceKey: keyof CaseServices
  serviceName: string
  title: string
  location?: string | null
  scheduledStart: string
  scheduledEnd?: string | null
  reportDueAt?: string | null
  reportSubmitted?: boolean
  reminderState?: 'DONE' | 'UPCOMING' | 'PENDING' | 'DUE_SOON' | 'OVERDUE'
  workDescription?: string | null
  notes?: string | null
  assignedUserId?: number | null
  assignedUserName?: string | null
  // 组织日历模板字段
  eventSeq?: number | null
  address?: string | null
  agenda?: string | null
  schedule?: string | null
  manpower?: string | null
  instructions?: string | null
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
  title?: string
  dateOpened: string
  closedAt?: string
  clientId: string
  clientAbbr?: string
  clientNameEn: string
  clientNameChn: string
  venue?: string
  tradition: string
  socialWorkerId?: string
  socialWorker: string
  assignedVolunteer?: string
  lastModifiedAt?: string
  lastModifiedBy?: string
  status: CaseStatus
  colorCode: CaseColorCode
  comments: string
  remarks: string
  services: CaseServices
  serviceEvents?: ServiceEvent[]
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
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  classNames?: string[]
  extendedProps?: {
    serviceType?: keyof CaseServices
    note?: string
    source?: CalendarEventSource
  }
}

export type CalendarEventSource = 'OWN_CASE' | 'OTHER_CASE' | 'EXTERNAL'

/** 从后端 /calendar-events 读回的 Google 共享日历事件 */
export interface SharedCalendarEvent {
  id: string
  title: string | null
  start: string | null
  end: string | null
  allDay: boolean
  source: 'OTHER_CASE' | 'EXTERNAL'
  caseId: number | null
  location?: string | null
  description?: string | null
  calendarId?: string | null
  calendarName?: string | null
}

/** 可写入的共享日历(供增添事件时选择) */
export interface CalendarOption {
  id: string
  name: string
  isDefault: boolean
}

export function emptyCaseServices(): CaseServices {
  return {
    accommodationArrangement: false,
    deepCleaning: false,
    relocationAssistance: false,
    dailyCleaning: false,
    pestControl: false,
    homeRepair: false,
    dailyExpenseSubsidy: false,
    cpfAssistance: false,
    mealDelivery: false,
    lunchSupport: false,
    monasticSupport: false,
    monasticEscort: false,
    legalAid: false,
    volunteerVisit: false,
    digitalSupport: false,
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
