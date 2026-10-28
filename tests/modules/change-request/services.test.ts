import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchChangeRequests, revealChangeRequest, updateChangeRequestStatus } from '../../../src/modules/change-request/services'

afterEach(() => server.resetHandlers())

describe('fetchChangeRequests', () => {
  it('POSTs the filter payload and returns the paginated envelope', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/admin/change-requests', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          status: true,
          message: 'ok',
          data: [
            {
              id: 1,
              partner_id: null,
              borrower_id: 2,
              field_name: 'email',
              old_value: 'old@x.com',
              new_value: 'new@x.com',
              status: 'pending',
              updated_by: null,
              note: null,
              created_at: '2026-01-01',
              updated_at: '2026-01-01',
              borrower_business_name: 'Acme',
              borrower_first_name: 'Jo',
              borrower_last_name: 'Doe',
              updater_name: null,
            },
          ],
          meta: { total: 1, per_page: 10, current_page: 1, last_page: 1 },
        })
      })
    )

    const result = await fetchChangeRequests({ page: 1 })
    expect(receivedBody).toEqual({ page: 1 })
    expect(result.data).toHaveLength(1)
    expect(result.meta.total).toBe(1)
  })

  it('defaults the payload to {} when none is given', async () => {
    let receivedBody: unknown = 'not-set'
    server.use(
      http.post('*/admin/change-requests', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: [], meta: { total: 0, per_page: 10, current_page: 1, last_page: 1 } })
      })
    )

    await fetchChangeRequests()
    expect(receivedBody).toEqual({})
  })
})

describe('updateChangeRequestStatus', () => {
  it('PATCHes the status/note payload to the id-scoped endpoint', async () => {
    let receivedBody: unknown = null
    server.use(
      http.patch('*/admin/change-requests/5', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          status: true,
          message: 'updated',
          data: {
            id: 5,
            partner_id: null,
            borrower_id: 2,
            field_name: 'email',
            old_value: 'old@x.com',
            new_value: 'new@x.com',
            status: 'Approved',
            updated_by: 9,
            note: 'looks good',
            created_at: '2026-01-01',
            updated_at: '2026-01-02',
            borrower_business_name: 'Acme',
            borrower_first_name: 'Jo',
            borrower_last_name: 'Doe',
            updater_name: 'Admin User',
          },
        })
      })
    )

    const result = await updateChangeRequestStatus(5, { status: 'Approved', note: 'looks good' })
    expect(receivedBody).toEqual({ status: 'Approved', note: 'looks good' })
    expect(result.data.status).toBe('Approved')
  })
})

// BUG-014: an SSN or EIN change is listed masked; the reviewer fetches both numbers.
describe('revealChangeRequest', () => {
  it('POSTs to the reveal and returns its old and new numbers', async () => {
    server.use(
      http.post('*/admin/change-requests/7/reveal', () =>
        HttpResponse.json({ status: true, data: { id: 7, old_value: '123456789', new_value: '234567890' } })
      )
    )
    await expect(revealChangeRequest(7)).resolves.toEqual({ old_value: '123456789', new_value: '234567890' })
  })
})
