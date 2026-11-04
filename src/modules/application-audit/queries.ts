import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import type { AuditExportFormat } from '../../config/auditConfig'
import { downloadAuditEventFile, exportFundingApplicationAuditTrail, getFundingApplicationAuditTrail } from './services'
import type { AuditTrailParams } from './types'

export const auditKeys = {
  all: (applicationId: string | number) => ['application-audit', String(applicationId)] as const,
  trail: (applicationId: string | number, params: AuditTrailParams = {}) =>
    [...auditKeys.all(applicationId), 'trail', params] as const,
}

/** A funding application's audit trail, one page at a time; the previous page stays while the next loads. */
export const useFundingApplicationAuditTrail = (applicationId: string | number, params: AuditTrailParams = {}) =>
  useQuery({
    queryKey: auditKeys.trail(applicationId, params),
    queryFn: () => getFundingApplicationAuditTrail(applicationId, params),
    enabled: !!applicationId,
    placeholderData: keepPreviousData,
    retry: false,
  })

export const useExportFundingApplicationAuditTrail = (applicationId: string | number) =>
  useMutation({
    mutationFn: ({ params, format }: { params: AuditTrailParams; format: AuditExportFormat }) =>
      exportFundingApplicationAuditTrail(applicationId, params, format),
  })

export const useDownloadAuditEventFile = (applicationId: string | number) =>
  useMutation({
    mutationFn: ({ eventId, fallbackName }: { eventId: number; fallbackName: string }) =>
      downloadAuditEventFile(applicationId, eventId, fallbackName),
  })
