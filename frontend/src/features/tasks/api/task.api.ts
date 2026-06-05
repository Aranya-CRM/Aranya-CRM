import { fetchAssignedServiceEvents } from '../../cases/api/case.api'
import type { ServiceEvent } from '../../cases/types'

export async function fetchAssignedTasks(): Promise<ServiceEvent[]> {
  return fetchAssignedServiceEvents()
}
