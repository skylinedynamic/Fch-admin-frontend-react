import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchCreditProfileRequests, fetchCreditProfileRequestDetails } from '../../../src/modules/credit-profile-request/services'
import type { CreditProfileRequest } from '../../../src/modules/credit-profile-request/types'

afterEach(() => server.resetHandlers())

const piiRequest: CreditProfileRequest = {
  id: 1,
  borrower_id: 10,
  first_name: 'Jane',
  middle_name: null,
  last_name: 'Doe',
  address: '123 Main St',
  apt_suite_other: null,
  city: 'Springfield',
  state: 'IL',
  zip: '62704',
  ssn: '123-45-6789',
  date_of_birth: '1990-01-01',
  phone: '555-0100',
  email: 'jane@example.com',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  borrower: {
    id: 10,
    business_name: 'Doe Consulting',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    phone_number: '555-0100',
  },
}

describe('fetchCreditProfileRequests', () => {
  it('POSTs the filter/pagination payload and returns the paginated envelope as-is, PII fields intact', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/admin/credit-profile-requests', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          status: true,
          message: 'Credit profile requests retrieved successfully.',
          data: {
            current_page: 1,
            data: [piiRequest],
            first_page_url: 'url',
            from: 1,
            last_page: 1,
            last_page_url: 'url',
            links: [],
            next_page_url: null,
            path: 'url',
            per_page: 15,
            prev_page_url: null,
            to: 1,
            total: 1,
          },
        })
      })
    )

    const result = await fetchCreditProfileRequests({ search: 'jane', per_page: 15 })

    expect(receivedBody).toEqual({ search: 'jane', per_page: 15 })
    expect(result.status).toBe(true)
    expect(result.data.data).toEqual([piiRequest])
    expect(result.data.data[0].ssn).toBe('123-45-6789')
    expect(result.data.total).toBe(1)
  })

  it('defaults the payload to {} when called with no arguments', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/admin/credit-profile-requests', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          status: true,
          message: 'ok',
          data: {
            current_page: 1,
            data: [],
            first_page_url: null,
            from: 0,
            last_page: 1,
            last_page_url: null,
            links: [],
            next_page_url: null,
            path: 'url',
            per_page: 15,
            prev_page_url: null,
            to: 0,
            total: 0,
          },
        })
      })
    )

    await fetchCreditProfileRequests()
    expect(receivedBody).toEqual({})
  })
})

describe('fetchCreditProfileRequestDetails', () => {
  it('GETs the request by id and returns the detail envelope with PII fields intact', async () => {
    server.use(
      http.get('*/admin/credit-profile-requests/1', () =>
        HttpResponse.json({
          status: true,
          message: 'Credit profile request retrieved successfully.',
          data: piiRequest,
        })
      )
    )

    const result = await fetchCreditProfileRequestDetails(1)
    expect(result.data).toEqual(piiRequest)
    expect(result.data.ssn).toBe('123-45-6789')
    expect(result.data.date_of_birth).toBe('1990-01-01')
    expect(result.data.borrower?.business_name).toBe('Doe Consulting')
  })

  it('accepts a string id and interpolates it into the URL', async () => {
    server.use(
      http.get('*/admin/credit-profile-requests/42', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...piiRequest, id: 42 } })
      )
    )

    const result = await fetchCreditProfileRequestDetails('42')
    expect(result.data.id).toBe(42)
  })
})
