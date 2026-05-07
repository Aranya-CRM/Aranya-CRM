export interface LocalizedText {
  zh: string
  en: string
}

export interface ActiveCase {
  id: string
  title: LocalizedText
  client: LocalizedText
  status: LocalizedText
}

export interface AttentionCase {
  id: string
  client: LocalizedText
  reason: LocalizedText
  daysOpen: number
}

export interface UpcomingAppointment {
  id: string
  startsAt: string
  client: LocalizedText
  purpose: LocalizedText
}

export interface DashboardData {
  activeCases: ActiveCase[]
  attentionCases: AttentionCase[]
  upcomingAppointments: UpcomingAppointment[]
}

export interface DashboardApiResponse {
  activeCases: ActiveCase[]
  attentionCases: AttentionCase[]
  upcomingAppointments: UpcomingAppointment[]
}

