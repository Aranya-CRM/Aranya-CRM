export type ServiceRequestMode = 'add' | 'remove'

export function serviceSelectionsForMode<T>(
  mode: ServiceRequestMode,
  servicesToAdd: T[],
  servicesToRemove: T[],
): { servicesToAdd: T[]; servicesToRemove: T[] } {
  return mode === 'add'
    ? { servicesToAdd, servicesToRemove: [] }
    : { servicesToAdd: [], servicesToRemove }
}

export function selectedServiceForMode<T>(
  mode: ServiceRequestMode,
  selectedService: T | '',
): { servicesToAdd: T[]; servicesToRemove: T[] } {
  if (!selectedService) return { servicesToAdd: [], servicesToRemove: [] }
  return mode === 'add'
    ? { servicesToAdd: [selectedService], servicesToRemove: [] }
    : { servicesToAdd: [], servicesToRemove: [selectedService] }
}
