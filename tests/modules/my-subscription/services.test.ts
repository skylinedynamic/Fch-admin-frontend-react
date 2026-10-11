import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchMySubscriptionDetails,
  updateMySubscriptionDefaultPaymentMethod,
  cancelMySubscription,
} from '../../../src/modules/my-subscription/services'

afterEach(() => server.resetHandlers())

describe('my-subscription services', () => {
  it('fetchMySubscriptionDetails fetches the current subscription', async () => {
    server.use(http.get('*/common/my-subscription', () => HttpResponse.json({ status: true, data: { plan: 'Pro' } })))
    await expect(fetchMySubscriptionDetails()).resolves.toEqual({ status: true, data: { plan: 'Pro' } })
  })

  it('updateMySubscriptionDefaultPaymentMethod sends only the Stripe payment method id — never raw card data', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/my-subscription/update-payment-method', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true })
      })
    )
    await updateMySubscriptionDefaultPaymentMethod({ provider_name: 'stripe', payment_method_id: 'pm_abc123' })
    expect(receivedBody).toEqual({ provider_name: 'stripe', payment_method_id: 'pm_abc123' })
    expect(receivedBody).not.toHaveProperty('cardNumber')
  })

  it('cancelMySubscription posts to the cancel route', async () => {
    server.use(http.post('*/common/my-subscription/cancel-subscription', () => HttpResponse.json({ status: true, message: 'Cancelled' })))
    await expect(cancelMySubscription()).resolves.toEqual({ status: true, message: 'Cancelled' })
  })
})
