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
