export type DashboardSectionId =
  | 'sw.stats'
  | 'sw.recent_cases'
  | 'sw.recent_reports'
  | 'sw.quick_actions'
  | 'volunteer.report_stats'
  | 'volunteer.my_recent_reports'
  | 'volunteer.quick_actions'

export interface DashboardResponse {
  designSystem?: {
    name?: string
    version?: string
  }
  screen?: {
    id?: string
    version?: string
  }
  sections: DashboardSection[]
  metadata?: {
    generatedAt?: string
  }
}

export interface DashboardSection {
  id: DashboardSectionId | string
  stats?: DashboardStat[]
  items?: DashboardItem[]
  actions?: DashboardAction[]
}

export interface DashboardStat {
  id: string
  value: string
}

export interface DashboardItem {
  id: string
  clientId?: string | null
  clientNameChn?: string | null
  clientNameEn?: string | null
  caseCode?: string | null
  statusCode?: string | null
  colorCode?: string | null
  openedAt?: string | null
  reportType?: string | null
  dateOfVisit?: string | null
  createdAt?: string | null
  createdById?: string | null
  createdByName?: string | null
}

export interface DashboardAction {
  id: string
  targetId?: string | null
}

