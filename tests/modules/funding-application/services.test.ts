import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchBusinessInfo,
  saveOwnershipInfo,
  fetchOwnershipInfo,
  saveFundingRequest,
  fetchFundingApplicationDocuments,
  deleteFundingApplicationDocument,
  uploadFundingApplicationDocuments,
  validateCoBorrower,
} from '../../../src/modules/funding-application/services'

afterEach(() => server.resetHandlers())

describe('funding-application services', () => {
  it('fetchBusinessInfo omits funding_request_id from params when not provided', async () => {
    let receivedUrl = ''
    server.use(
      http.get('*/common/funding-application/business-info', ({ request }) => {
        receivedUrl = request.url
        return HttpResponse.json({ status: true, data: {} })
      })
    )
    await fetchBusinessInfo()
    expect(receivedUrl).not.toContain('funding_request_id')
  })

  it('fetchBusinessInfo includes funding_request_id when provided', async () => {
    let receivedUrl = ''
    server.use(
      http.get('*/common/funding-application/business-info', ({ request }) => {
        receivedUrl = request.url
        return HttpResponse.json({ status: true, data: {} })
      })
    )
    await fetchBusinessInfo(42)
    expect(receivedUrl).toContain('funding_request_id=42')
  })

  it('saveOwnershipInfo posts the SSN only to the ownership-info endpoint (never a generic/logging endpoint)', async () => {
    let receivedBody: any = null
    let receivedPath = ''
    server.use(
      http.post('*/common/funding-application/ownership-info', async ({ request }) => {
        receivedPath = new URL(request.url).pathname
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: { id: 1 } })
      })
    )
    await saveOwnershipInfo({
      id: null,
      first_name: 'Jane',
      last_name: 'Doe',
      date_of_birth: '1990-01-01',
      ssn: '123456789',
      citizenship_status: 'us_citizen',
      street_address: '123 Main St',
      country: 'US',
      city: 'Austin',
      state: 'TX',
      zip_code: '78701',
      ownership: '100',
      has_co_borrower: false,
    })
    expect(receivedPath.endsWith('/common/funding-application/ownership-info')).toBe(true)
    expect(receivedBody.ssn).toBe('123456789')
  })

  it('fetchOwnershipInfo unwraps data.data from the response envelope', async () => {
    server.use(
      http.get('*/common/funding-application/ownership-info', () =>
        HttpResponse.json({ status: true, data: { id: 1, first_name: 'Jane' } })
      )
    )
    await expect(fetchOwnershipInfo(1)).resolves.toEqual({ id: 1, first_name: 'Jane' })
  })

  it('saveFundingRequest posts the payload and unwraps the response', async () => {
    server.use(
      http.post('*/common/funding-application/funding-request', () =>
        HttpResponse.json({ status: true, data: { id: 5, requested_amount: '10000' } })
      )
    )
    await expect(saveFundingRequest({ id: null, requested_amount: '10000' } as any)).resolves.toEqual({
      id: 5,
      requested_amount: '10000',
    })
  })

  it('fetchFundingApplicationDocuments GETs by id and unwraps the array', async () => {
    server.use(
      http.get('*/common/funding-application/documents/8', () =>
        HttpResponse.json({ status: true, data: [{ id: 1, name: 'w2.pdf' }] })
      )
    )
    await expect(fetchFundingApplicationDocuments(8)).resolves.toEqual([{ id: 1, name: 'w2.pdf' }])
  })

  it('deleteFundingApplicationDocument DELETEs by document id', async () => {
    server.use(http.delete('*/common/funding-application/documents/12', () => HttpResponse.json({ message: 'Deleted' })))
    await expect(deleteFundingApplicationDocument(12)).resolves.toEqual({ message: 'Deleted' })
  })

  it('uploadFundingApplicationDocuments posts the application id, document type, and file list', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/funding-application/documents/upload', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ message: 'Uploaded' })
      })
    )
    await uploadFundingApplicationDocuments({ funding_application_id: 8, document_type_id: 2, files: ['s3://path/file.pdf'] })
    expect(receivedBody).toEqual({ funding_application_id: 8, document_type_id: 2, files: ['s3://path/file.pdf'] })
  })

  it('validateCoBorrower posts the co-borrower payload including SSN to the validation endpoint only', async () => {
    let receivedPath = ''
    let receivedBody: any = null
    server.use(
      http.post('*/common/funding-application/co-borrower-validation', async ({ request }) => {
        receivedPath = new URL(request.url).pathname
        receivedBody = await request.json()
        return HttpResponse.json({ status: true })
      })
    )
    await validateCoBorrower({
      first_name: 'John',
      last_name: 'Smith',
      role: 'co-borrower',
      ownership: '50',
      email: 'john@example.com',
      mobile_phone: '5551234567',
      home_phone: '',
      date_of_birth: '1985-05-05',
      ssn: '987654321',
      street_address: '456 Oak St',
      country: 'US',
      state: 'TX',
      city: 'Austin',
      zip_code: '78701',
      drivers_license_number: 'DL123',
      drivers_license_state: 'TX',
      phone_country_code: '+1',
    })
    expect(receivedPath.endsWith('/co-borrower-validation')).toBe(true)
    expect(receivedBody.ssn).toBe('987654321')
  })
})
