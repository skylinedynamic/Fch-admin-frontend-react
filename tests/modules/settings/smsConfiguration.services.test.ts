import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchSmsConfiguration,
  saveSmsConfiguration,
  sendTestSms,
} from '../../../src/modules/settings/services'

afterEach(() => server.resetHandlers())

describe('sms configuration services', () => {
  it('fetchSmsConfiguration GETs the partner configuration with its options', async () => {
    const body = { status: true, data: { configuration: null, options: { countries: [] } } }
    server.use(http.get('*/common/sms-configuration', () => HttpResponse.json(body)))

    await expect(fetchSmsConfiguration()).resolves.toEqual(body)
  })

  it('saveSmsConfiguration posts the payload as-is', async () => {
    let received: unknown = null
    server.use(
      http.post('*/common/sms-configuration', async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({ status: true, data: { configuration: null, options: { countries: [] } } })
      })
    )

    const payload = {
      country: 'USA',
      provider: 'twilio',
      is_enabled: true,
      account_sid: 'AC1',
      auth_token: '',
      from_number: '+15005550006',
      messaging_service_sid: '',
    }
    await saveSmsConfiguration(payload)

    expect(received).toEqual(payload)
  })

  it('sendTestSms posts the phone number to the test endpoint', async () => {
    let received: unknown = null
    server.use(
      http.post('*/common/sms-configuration/test', async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({ status: true, message: 'Sent' })
      })
    )

    await sendTestSms({ phone: '+15551234567' })

    expect(received).toEqual({ phone: '+15551234567' })
  })
})
