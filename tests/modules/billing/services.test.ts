import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchUpcomingBilling, fetchBillingDetails } from '../../../src/modules/billing/services'

afterEach(() => server.resetHandlers())

describe('billing services', () => {
  it('fetchUpcomingBilling posts the filter payload, defaulting to {}', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/billing/fetch-upcoming', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await fetchUpcomingBilling()
    expect(receivedBody).toEqual({})
  })

  it('fetchBillingDetails fetches by id', async () => {
    server.use(http.get('*/common/billing/6', () => HttpResponse.json({ status: true, data: { id: 6 } })))
    await expect(fetchBillingDetails(6)).resolves.toEqual({ status: true, data: { id: 6 } })
  })
})
