export interface ServiceTitleSource {
  id?: string | number | null
  caseCode?: string | null
  serviceNumber?: string | number | null
  programmeName?: string | null
  reportType?: string | null
  typeOfVisit?: string | null
  clientAbbr?: string | null
  clientNameEn?: string | null
  clientNameChn?: string | null
  location?: string | null
}

function text(value: string | number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value).trim()
}

/**
 * Builds the temporary report name in the form:
 *   [running service num] [service name]:[client abbr]@[venue]
 * Missing trailing parts (abbr / venue) are omitted gracefully.
 */
export function formatServiceTitle(source: ServiceTitleSource): string {
  const runningServiceNum = text(source.serviceNumber) || text(source.id)
  const serviceName = text(source.programmeName) || text(source.reportType) || text(source.typeOfVisit) || 'Service'
  const clientAbbr = text(source.clientAbbr)
  const venue = text(source.location)

  let title = runningServiceNum ? `${runningServiceNum} ${serviceName}` : serviceName
  if (clientAbbr) title += `:${clientAbbr}`
  if (venue) title += `@${venue}`
  return title
}
