import { apiClient } from '../../lib/http/apiClient'
import { downloadBlob } from '../../utils/fileDownload'
import { AUDIT_EXPORT_FORMAT, AUDIT_EXPORT_OPTIONS, type AuditExportFormat } from '../../config/auditConfig'
import type { AuditTrailParams, AuditTrailResponse } from './types'

const trailUrl = (applicationId: string | number) =>
  `/common/request-application/funding-application/${applicationId}/audit-trail`

/** Only the filters that are set: an empty search or event is no filter. */
const filters = (params: AuditTrailParams = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null))

/** The file name the API gives in Content-Disposition, else the fallback. */
const fileName = (disposition: string | undefined, fallback: string) => {
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  return match ? decodeURIComponent(match[1]) : fallback
}

export const getFundingApplicationAuditTrail = async (
  applicationId: string | number,
  params: AuditTrailParams = {}
): Promise<AuditTrailResponse> => {
  const { data } = await apiClient.get<AuditTrailResponse>(trailUrl(applicationId), { params: filters(params) })
  return data
}

/** The trail, with the same filters, saved as CSV or PDF. */
export const exportFundingApplicationAuditTrail = async (
  applicationId: string | number,
  params: AuditTrailParams = {},
  format: AuditExportFormat = AUDIT_EXPORT_FORMAT.CSV
): Promise<void> => {
  const { page: _page, per_page: _perPage, ...rest } = params
  const response = await apiClient.get(`${trailUrl(applicationId)}/export`, {
    params: { ...filters(rest), format },
    responseType: 'blob',
  })
  const option = AUDIT_EXPORT_OPTIONS.find((o) => o.value === format)
  downloadBlob(
    response.data as Blob,
    fileName(response.headers['content-disposition'], `audit-trail-application-${applicationId}.${format}`),
    option?.mimeType
  )
}

/** The copy of a document the trail kept for an event. */
export const downloadAuditEventFile = async (
  applicationId: string | number,
  eventId: number,
  fallbackName: string
): Promise<void> => {
  const response = await apiClient.get(`${trailUrl(applicationId)}/${eventId}/file`, { responseType: 'blob' })
  downloadBlob(
    response.data as Blob,
    fileName(response.headers['content-disposition'], fallbackName),
    typeof response.headers['content-type'] === 'string' ? response.headers['content-type'] : undefined
  )
}
