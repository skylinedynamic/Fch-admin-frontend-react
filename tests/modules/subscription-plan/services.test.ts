import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchPlanFeeSubscriptions, updatePlanFeeSubscription } from '../../../src/modules/subscription-plan/services'

afterEach(() => server.resetHandlers())

describe('subscription-plan services', () => {
  it('fetchPlanFeeSubscriptions posts the filter payload, defaulting to {}', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/admin/plan-fee/fetch-subscription-plans', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await fetchPlanFeeSubscriptions()
    expect(receivedBody).toEqual({})
  })

  it('updatePlanFeeSubscription PUTs the payload to the id-scoped route', async () => {
    let calledPath = ''
    server.use(
      http.put('*/admin/plan-fee/update-subscription-plan/4', ({ request }) => {
        calledPath = new URL(request.url).pathname
        return HttpResponse.json({ status: true, data: { id: 4 } })
      })
    )
    await updatePlanFeeSubscription(4, { fee: 49 })
    expect(calledPath.endsWith('/admin/plan-fee/update-subscription-plan/4')).toBe(true)
  })
})
