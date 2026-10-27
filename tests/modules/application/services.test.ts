import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  getPreQualificationApplications,
  getFundingApplications,
  getPreQualificationApplicationDetails,
  updateApplicationStatus,
  getFundingApplicationDetails,
  updateFundingApplicationStatus,
  getFundingApplicationStats,
  getPreQualificationStats,
  saveFundingApplicationCommission,
  getFundingRequests,
  getFundingRequestDetails,
  updateFundingRequestStatus,
  assignLenderToFundingRequest,
  downloadFundingApplication,
  getFundingApplicationAuditHistory,
} from '../../../src/modules/application/services'

afterEach(() => server.resetHandlers())

describe('getPreQualificationApplications', () => {
  it('POSTs the payload and resolves the paginated envelope', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/request-application/pre-qualification', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          status: true,
          message: 'ok',
          data: [{ id: 1, full_name: 'John Doe', business_name: 'Acme', industry: 'Retail', date: '2026-01-01', requested_amount: '1000', status: 'pending', funding_type: null }],
          meta: { current_page: 1, from: 1, to: 1, per_page: 10, total: 1, last_page: 1, next_page_url: null, prev_page_url: null, links: [] },
        })
      })
    )

    const result = await getPreQualificationApplications({ page: 1, search: 'John' })
    expect(receivedBody).toEqual({ page: 1, search: 'John' })
    expect(result.data).toHaveLength(1)
    expect(result.meta.total).toBe(1)
  })

  it('defaults the payload to {} when omitted', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/request-application/pre-qualification', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: [], meta: {} })
      })
    )
    await getPreQualificationApplications()
    expect(receivedBody).toEqual({})
  })
})

describe('getFundingApplications', () => {
  it('POSTs the payload to the funding-application endpoint', async () => {
    server.use(
      http.post('*/common/request-application/funding-application', () =>
        HttpResponse.json({ status: true, message: 'ok', data: [], meta: {} })
      )
    )
    const result = await getFundingApplications({ status: 'approved' })
    expect(result.status).toBe(true)
  })
})

describe('getPreQualificationApplicationDetails', () => {
  it('GETs the record by id', async () => {
    server.use(
      http.get('*/common/request-application/pre-qualification/5', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { id: 5, business_name: 'Acme' } })
      )
    )
    const result = await getPreQualificationApplicationDetails(5)
    expect(result.data.id).toBe(5)
  })
})

describe('updateApplicationStatus', () => {
  it('POSTs id/status/status_note to the status-update endpoint', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/request-application/pre-qualification/status-update', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Updated', data: {} })
      })
    )
    await updateApplicationStatus({ id: 1, status: 'approved', status_note: 'looks good' })
    expect(receivedBody).toEqual({ id: 1, status: 'approved', status_note: 'looks good' })
  })
})

describe('getFundingApplicationDetails', () => {
  it('GETs the funding application by id', async () => {
    server.use(
      http.get('*/common/request-application/funding-application/9', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { id: 9, application_number: 'FA-9' } })
      )
    )
    const result = await getFundingApplicationDetails(9)
    expect(result.data.application_number).toBe('FA-9')
  })
})

describe('updateFundingApplicationStatus', () => {
  it('POSTs the full payload including funded_amount', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/request-application/funding-application/status-update', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Updated', data: {} })
      })
    )
    await updateFundingApplicationStatus({ funding_application_id: 9, status: 'funded', funded_amount: '5000' })
    expect(receivedBody).toEqual({ funding_application_id: 9, status: 'funded', funded_amount: '5000' })
  })
})

describe('getFundingApplicationStats / getPreQualificationStats', () => {
  it('GETs the funding application card-summary', async () => {
    server.use(
      http.get('*/common/request-application/funding-application/card-summary', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { approved: 3, pending: 2, approved_amount: 1000 } })
      )
    )
    const result = await getFundingApplicationStats()
    expect(result.data.approved).toBe(3)
  })

  it('GETs the pre-qualification card-summary', async () => {
    server.use(
      http.get('*/common/request-application/pre-qualification/card-summary', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { approved: 1, pending: 1, approved_amount: 0 } })
      )
    )
    const result = await getPreQualificationStats()
    expect(result.data.pending).toBe(1)
  })
})

describe('saveFundingApplicationCommission', () => {
  it('POSTs the commission payload to the admin save-commission endpoint', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/admin/funding-application/save-commission', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Saved', data: {} })
      })
    )
    await saveFundingApplicationCommission({
      funding_application_id: 9,
      total_commission: 500,
      admin_commission: '300',
      partner_commission: '200',
    })
    expect(receivedBody).toEqual({
      funding_application_id: 9,
      total_commission: 500,
      admin_commission: '300',
      partner_commission: '200',
    })
  })
})

describe('getFundingRequests / getFundingRequestDetails', () => {
  it('POSTs the list payload to /common/funding-request', async () => {
    server.use(
      http.post('*/common/funding-request', () => HttpResponse.json({ status: true, message: 'ok', data: [], meta: {} }))
    )
    const result = await getFundingRequests({ page: 2 })
    expect(result.status).toBe(true)
  })

  it('GETs a single funding request by id', async () => {
    server.use(
      http.get('*/common/funding-request/3', () => HttpResponse.json({ status: true, message: 'ok', data: { id: 3 } }))
    )
    const result = await getFundingRequestDetails(3)
    expect(result.data.id).toBe(3)
  })
})

describe('updateFundingRequestStatus', () => {
  it('POSTs id/status/reject_reason', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/funding-request/status-update', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Updated', data: {} })
      })
    )
    await updateFundingRequestStatus({ id: 3, status: 'rejected', reject_reason: 'incomplete docs' })
    expect(receivedBody).toEqual({ id: 3, status: 'rejected', reject_reason: 'incomplete docs' })
  })
})

describe('assignLenderToFundingRequest', () => {
  it('POSTs id/lender_ids to the assign-lender endpoint', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/funding-request/assign-lender', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Assigned', data: {} })
      })
    )
    await assignLenderToFundingRequest({ id: 3, lender_ids: [1, 2] })
    expect(receivedBody).toEqual({ id: 3, lender_ids: [1, 2] })
  })
})

describe('getFundingApplicationAuditHistory', () => {
  it('POSTs params to the audit-history endpoint for the given id', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/request-application/funding-application/9/audit-history', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: [], meta: {} })
      })
    )
    await getFundingApplicationAuditHistory('9', { page: 1 })
    expect(receivedBody).toEqual({ page: 1 })
  })
})

describe('downloadFundingApplication', () => {
  const originalCreateObjectURL = window.URL.createObjectURL
  const originalRevokeObjectURL = window.URL.revokeObjectURL

  afterEach(() => {
    window.URL.createObjectURL = originalCreateObjectURL
    window.URL.revokeObjectURL = originalRevokeObjectURL
    vi.restoreAllMocks()
  })

  // BUG-094: the password used to go in the query string (and so into server
  // and proxy logs); it is now POSTed in the body.
  it('posts the password in the body, not the URL, and derives the filename from Content-Disposition', async () => {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    window.URL.revokeObjectURL = vi.fn()
    let requestedUrl = ''
    let requestedBody: unknown = null
    server.use(
      http.post('*/common/request-application/funding-application/9/download-application', async ({ request }) => {
        requestedUrl = request.url
        requestedBody = await request.json()
        return new HttpResponse('pdf-bytes', {
          headers: { 'Content-Disposition': 'attachment; filename="Custom_Name.pdf"' },
        })
      })
    )

    const clickSpy = vi.fn()
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') el.click = clickSpy
      return el
    })

    await downloadFundingApplication(9, 'p@ss word')

    expect(requestedUrl).not.toContain('password')
    expect(requestedBody).toEqual({ password: 'p@ss word' })
    expect(clickSpy).toHaveBeenCalled()
    expect(appendSpy).toHaveBeenCalled()
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('falls back to a default filename when Content-Disposition is absent', async () => {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    window.URL.revokeObjectURL = vi.fn()
    server.use(
      http.post('*/common/request-application/funding-application/11/download-application', () => new HttpResponse('pdf-bytes'))
    )

    let downloadAttr = ''
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        el.click = vi.fn()
        const originalSetAttribute = el.setAttribute.bind(el)
        el.setAttribute = (name: string, value: string) => {
          if (name === 'download') downloadAttr = value
          return originalSetAttribute(name, value)
        }
      }
      return el
    })

    await downloadFundingApplication(11)
    expect(downloadAttr).toBe('Funding_Application_11.pdf')
  })
})
