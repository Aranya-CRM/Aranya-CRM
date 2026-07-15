import { fetchAssignedServiceEvents } from '../../cases/api/case.api'
import type { ServiceEvent } from '../../cases/types'

export async function fetchEvents(scope: 'mine' | 'all' | 'created' = 'mine'): Promise<ServiceEvent[]> {
  return fetchAssignedServiceEvents(scope)
}
