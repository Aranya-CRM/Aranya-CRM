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

export function formatServiceTitle(source: ServiceTitleSource): string {
  const runningServiceNum = text(source.serviceNumber) || text(source.id)
  const serviceName = text(source.programmeName) || text(source.reportType) || text(source.typeOfVisit) || 'Service'
  return runningServiceNum ? `${runningServiceNum} ${serviceName}` : serviceName
}
