import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchAdminProviders, updateAdminProvider } from '../../../src/modules/payment-method/services'

afterEach(() => server.resetHandlers())

// NOTE (PCI scope check): this module only ever manages the *display/enable*
// state of a payment provider (status, logo URL) for the admin's provider
// list — it never touches a card number, CVC, expiry, or any other raw card
// field. updateAdminProvider's payload type is `{ status?: boolean; logo?: string }`,
// so there is nothing tokenized (e.g. a Stripe payment_method_id) flowing
// through this module either — it is not where card data enters the system.
// The tests below assert the payload stays limited to those two fields.

describe('payment-method services', () => {
  it('fetchAdminProviders returns the raw envelope from /admin/payment-methods', async () => {
    server.use(
      http.get('*/admin/payment-methods', () =>
        HttpResponse.json({
          status: true,
          data: [{ id: 1, name: 'Stripe', logo: null, status: true, slug: 'stripe', created_at: '', updated_at: '' }],
        })
      )
    )
    await expect(fetchAdminProviders()).resolves.toEqual({
      status: true,
      data: [{ id: 1, name: 'Stripe', logo: null, status: true, slug: 'stripe', created_at: '', updated_at: '' }],
    })
  })

  it('updateAdminProvider posts only status/logo to the id-scoped route (never raw card data)', async () => {
    let calledPath = ''
    let receivedBody: unknown = null
    server.use(
      http.post('*/admin/payment-methods/:id', async ({ request }) => {
        calledPath = new URL(request.url).pathname
        receivedBody = await request.json()
        return HttpResponse.json({
          status: true,
          data: { id: 3, name: 'Stripe', logo: 'https://x/y.png', status: false, slug: 'stripe', created_at: '', updated_at: '' },
        })
      })
    )
    await updateAdminProvider(3, { status: false, logo: 'https://x/y.png' })
    expect(calledPath.endsWith('/admin/payment-methods/3')).toBe(true)
    expect(receivedBody).toEqual({ status: false, logo: 'https://x/y.png' })
    expect(Object.keys(receivedBody as object)).toEqual(['status', 'logo'])
  })
})
