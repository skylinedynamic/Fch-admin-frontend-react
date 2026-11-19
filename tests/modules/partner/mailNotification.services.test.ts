import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchPartnerMailNotification, updatePartnerMailNotification } from '../../../src/modules/partner/services'

/**
 * Partner profile › Mail Notification (fch-api GET/PUT
 * /admin/partners/{id}/mail-notification): every notification type with where
 * its emails go - null for the partner's own email.
 */
afterEach(() => server.resetHandlers())

const LIST = [
  { type: 'leads', label: 'Lead Notification Recipient', help: 'When a lead is created.', email: 'leads@acme.test' },
  { type: 'clients', label: 'Client Notification Recipient', help: 'When a client is added.', email: null },
]

describe('fetchPartnerMailNotification', () => {
  it("GETs the partner's recipients, one per notification type", async () => {
    server.use(http.get('*/admin/partners/21/mail-notification', () => HttpResponse.json({ status: true, data: LIST })))

    expect(await fetchPartnerMailNotification(21)).toEqual(LIST)
  })

  it('gives an empty list, not a crash, when the answer is not a list', async () => {
    server.use(http.get('*/admin/partners/21/mail-notification', () => HttpResponse.json({ status: true, data: null })))

    expect(await fetchPartnerMailNotification(21)).toEqual([])
  })
})

describe('updatePartnerMailNotification', () => {
  it('PUTs the recipients by type - null to use the partner email again', async () => {
    let body: unknown = null
    server.use(http.put('*/admin/partners/21/mail-notification', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, message: 'Mail notification recipients updated successfully.', data: LIST })
    }))

    const res = await updatePartnerMailNotification(21, { leads: 'leads@acme.test', clients: null })

    expect(body).toEqual({ recipients: { leads: 'leads@acme.test', clients: null } })
    expect(res.message).toBe('Mail notification recipients updated successfully.')
    expect(res.data).toEqual(LIST)
  })
})
