import type { ReportDetail } from '../features/reports/types'

export const reportMockData: ReportDetail[] = [
  {
    id: 1,
    reportTimestamp: '2026-03-10T16:00:00+08:00',
    dateOfVisit: '2026-03-10',
    timeOfVisit: '14:00',
    durationOfVisit: '1.5 hours',
    staffName: 'Admin',
    location: 'Temporary Shelter, Geylang',
    programmeName: 'Aranya Monastic Support',
    clientId: 1,
    clientNameChn: '释慧明',
    clientNameEn: 'Venerable Sumedho',
    typeOfVisit: 'Home Visit',
    purposeOfVisit: 'Welfare check and housing assessment',
    whatWasDone: 'Assessed current living conditions. Discussed housing options with client.',
    environmentObservations: 'Temporary accommodation is clean but cramped.',
    sanghaObservations: 'Client appears tired but in good spirits.',
    otherObservations: 'Client has difficulty walking up stairs.',
    personalReflections: 'Client shows resilience despite circumstances.',
    recommendations: 'Prioritize ground-floor housing options.',
    mattersToHighlight: 'Temporary accommodation lease expires in 30 days.',
    createdById: 1,
    createdByName: 'Admin',
    createdAt: '2026-03-10T16:00:00+08:00',
  },
]
