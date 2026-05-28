import type { DashboardResponse } from '../features/dashboard/types'

export const dashboardMockData: DashboardResponse = {
  designSystem: {
    name: 'aranya-crm-dashboard',
    version: '1.0',
  },
  screen: {
    id: 'dashboard',
    version: '2026-05-13',
  },
  sections: [
    {
      id: 'sw.stats',
      stats: [
        { id: 'myAssignedClients', value: '6' },
        { id: 'myOpenCases', value: '4' },
        { id: 'myUrgentCases', value: '2' },
        { id: 'myDraftReports', value: '1' },
      ],
    },
    {
      id: 'sw.recent_cases',
      items: [
        {
          id: 'case-001',
          clientId: 'client-001',
          clientNameChn: '释妙音',
          clientNameEn: 'Ven. Pasanno',
          caseCode: 'ARANYA/2026/C/103',
          statusCode: 'OPEN',
          colorCode: 'RED',
          openedAt: '2026-03-12T10:00:00+08:00',
        },
        {
          id: 'case-002',
          clientId: 'client-002',
          clientNameChn: '释慧明',
          clientNameEn: 'Ven. Sumedho',
          caseCode: 'ARANYA/2026/C/100',
          statusCode: 'WEEKLY',
          colorCode: 'ORANGE',
          openedAt: '2026-03-10T10:00:00+08:00',
        },
      ],
    },
    {
      id: 'sw.recent_reports',
      items: [
        {
          id: 'report-001',
          clientId: 'client-003',
          clientNameChn: '释德行',
          clientNameEn: 'Ven. Bodhi',
          reportType: 'Temple Visit',
          dateOfVisit: '2026-03-08',
          statusCode: 'SUBMITTED',
          createdAt: '2026-03-08T18:00:00+08:00',
          createdById: 'user-001',
          createdByName: 'Volunteer Lee',
        },
        {
          id: 'report-002',
          clientId: 'client-001',
          clientNameChn: '释妙音',
          clientNameEn: 'Ven. Pasanno',
          reportType: 'Home Visit',
          dateOfVisit: '2026-03-15',
          statusCode: 'DRAFT',
          createdAt: '2026-03-15T14:30:00+08:00',
          createdById: 'user-sw-001',
          createdByName: 'SW Chan',
        },
      ],
    },
    {
      id: 'sw.quick_actions',
      actions: [
        { id: 'new_case' },
        { id: 'add_client' },
        { id: 'submit_report' },
      ],
    },
  ],
  metadata: {
    generatedAt: '2026-05-19T00:00:00+08:00',
  },
}

