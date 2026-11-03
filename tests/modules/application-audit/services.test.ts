import { afterEach, describe, expect, it, vi } from 'vitest'
import { AUDIT_EXPORT_FORMAT } from '../../../src/config/auditConfig'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  getFundingApplicationAuditTrail,
  exportFundingApplicationAuditTrail,
  downloadAuditEventFile,
} from '../../../src/modules/application-audit/services'
import * as fileDownload from '../../../src/utils/fileDownload'

afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})

const TRAIL = '*/common/request-application/funding-application/9/audit-trail'

describe('getFundingApplicationAuditTrail', () => {
  it('GETs the trail with only the filters that are set and returns the envelope', async () => {
    let query: URLSearchParams | null = null
    server.use(
      http.get(TRAIL, ({ request }) => {
        query = new URL(request.url).searchParams
        return HttpResponse.json({
          status: true,
          data: [{ id: 1, event: 'updated' }],
          pagination: { total: 1, per_page: 25, current_page: 1, last_page: 1 },
          integrity: { valid: true, broken_at: null, checked: 1 },
        })
      })
    )

    const result = await getFundingApplicationAuditTrail(9, { page: 2, per_page: 25, event: 'status_changed', search: '' })

    expect(query!.get('page')).toBe('2')
    expect(query!.get('event')).toBe('status_changed')
    expect(query!.has('search')).toBe(false)
    expect(result.data).toEqual([{ id: 1, event: 'updated' }])
    expect(result.integrity.valid).toBe(true)
  })
})

describe('exportFundingApplicationAuditTrail', () => {
  it('downloads the CSV under the name the API gives', async () => {
    const saved = vi.spyOn(fileDownload, 'downloadBlob').mockImplementation(() => {})
    server.use(
      http.get(`${TRAIL}/export`, () =>
        new HttpResponse('Date (UTC),Event\n', {
          headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=audit-trail-application-9.csv' },
        })
      )
    )

    await exportFundingApplicationAuditTrail(9, { event: 'downloaded' })

    expect(saved).toHaveBeenCalledWith(expect.any(Blob), 'audit-trail-application-9.csv', 'text/csv')
  })

  it('asks for the PDF and saves it under the name the API gives', async () => {
    const saved = vi.spyOn(fileDownload, 'downloadBlob').mockImplementation(() => {})
    let asked: URLSearchParams | null = null
    server.use(
      http.get(`${TRAIL}/export`, ({ request }) => {
        asked = new URL(request.url).searchParams
        return new HttpResponse('%PDF', {
          headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=audit-trail-application-9.pdf' },
        })
      })
    )

    await exportFundingApplicationAuditTrail(9, { event: 'downloaded', page: 2 }, AUDIT_EXPORT_FORMAT.PDF)

    expect(asked!.get('format')).toBe('pdf')
    expect(asked!.get('event')).toBe('downloaded')
    expect(asked!.get('page')).toBeNull()
    expect(saved).toHaveBeenCalledWith(expect.any(Blob), 'audit-trail-application-9.pdf', 'application/pdf')
  })
})

describe('downloadAuditEventFile', () => {
  it('downloads the file the trail kept for an event', async () => {
    const saved = vi.spyOn(fileDownload, 'downloadBlob').mockImplementation(() => {})
    server.use(
      http.get(`${TRAIL}/14/file`, () =>
        new HttpResponse('%PDF', { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="Tax return.pdf"' } })
      )
    )

    await downloadAuditEventFile(9, 14, 'fallback.pdf')

    expect(saved).toHaveBeenCalledWith(expect.any(Blob), 'Tax return.pdf', 'application/pdf')
  })
})
