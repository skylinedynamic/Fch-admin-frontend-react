import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchVerificationRequests,
  fetchBorrowerVerificationRequests,
  getBorrowerProfile,
  updateVerificationStatus,
} from '../../../src/modules/verification-center/services'

afterEach(() => server.resetHandlers())

describe('verification-center services', () => {
  it('fetchVerificationRequests posts the filter payload and returns the envelope', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/credit-builder/verification-center-fetch-all', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await fetchVerificationRequests({ status: 'pending' })
    expect(receivedBody).toEqual({ status: 'pending' })
  })

  it('fetchBorrowerVerificationRequests scopes by borrower_id', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/credit-builder/verification-center-borrower-requests', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await fetchBorrowerVerificationRequests({ borrower_id: 5, page: 2 })
    expect(receivedBody).toEqual({ borrower_id: 5, page: 2 })
  })

  it('getBorrowerProfile fetches by id', async () => {
    server.use(
      http.get('*/common/borrowers/get-borrower-profile/9', () =>
        HttpResponse.json({ status: true, data: { id: 9, name: 'Jane' } })
      )
    )
    await expect(getBorrowerProfile(9)).resolves.toEqual({ status: true, data: { id: 9, name: 'Jane' } })
  })

  it('updateVerificationStatus posts request_ids/status/note together', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/credit-builder/verification-center-status-update', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Updated' })
      })
    )
    await updateVerificationStatus({ request_ids: [1, 2], status: 'Approved', note: 'Looks good' })
    expect(receivedBody).toEqual({ request_ids: [1, 2], status: 'Approved', note: 'Looks good' })
  })
})
