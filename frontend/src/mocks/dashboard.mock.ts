import type { DashboardData } from '../features/dashboard/types'

export const dashboardMockData: DashboardData = {
  activeCases: [
    {
      id: 'case-001',
      title: { zh: '紧急住房支持', en: 'Emergency Housing Support' },
      client: { zh: '释慧明', en: 'Monastic Sumedho' },
      status: { zh: '审核中', en: 'In Review' },
    },
    {
      id: 'case-002',
      title: { zh: '医疗交通', en: 'Medical Transportation' },
      client: { zh: '释觉慧', en: 'Monastic Ajahn Chah' },
      status: { zh: '每周跟进', en: 'Weekly' },
    },
    {
      id: 'case-003',
      title: { zh: '食品援助计划', en: 'Food Assistance Program' },
      client: { zh: '释德行', en: 'Monastic Bodhi' },
      status: { zh: '开放中', en: 'Open' },
    },
  ],
  attentionCases: [
    {
      id: 'attention-001',
      client: { zh: '释妙音', en: 'Monastic Pasanno' },
      reason: { zh: '等待志愿者分配', en: 'Awaiting volunteer assignment' },
      daysOpen: 5,
    },
    {
      id: 'attention-002',
      client: { zh: '释瑟空', en: 'Monastic Thanissaro' },
      reason: { zh: '需要跟进', en: 'Follow-up required' },
      daysOpen: 3,
    },
  ],
  upcomingAppointments: [
    {
      id: 'appt-001',
      startsAt: '2026-03-28T10:00:00+08:00',
      client: { zh: '释慧明', en: 'Monastic Sumedho' },
      purpose: { zh: '家访评估', en: 'Home Visit Assessment' },
    },
    {
      id: 'appt-002',
      startsAt: '2026-03-29T14:00:00+08:00',
      client: { zh: '释德行', en: 'Monastic Bodhi' },
      purpose: { zh: '跟进电话', en: 'Follow-up Call' },
    },
    {
      id: 'appt-003',
      startsAt: '2026-04-01T09:00:00+08:00',
      client: { zh: '释觉慧', en: 'Monastic Ajahn Chah' },
      purpose: { zh: '医疗交通协调', en: 'Medical Transport Coordination' },
    },
  ],
}


