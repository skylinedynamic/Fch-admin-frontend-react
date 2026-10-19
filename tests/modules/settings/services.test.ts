import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  sendTestMail,
  fetchGlobalConfigurations,
  fetchAppConfigurations,
  saveAppConfigurations,
  fetchScoreConfigurations,
  updateScoreConfigurations,
  updateTimeSettings,
  fetchPartnerPaymentProviderConfig,
  updatePartnerPaymentProviderStatus,
} from '../../../src/modules/settings/services'

afterEach(() => server.resetHandlers())

describe('settings services', () => {
  it('sendTestMail posts the payload to the notifications endpoint', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/notifications/test-email', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Sent' })
      })
    )
    await sendTestMail({ to: 'test@example.com' } as any)
    expect(receivedBody).toEqual({ to: 'test@example.com' })
  })

  it('fetchGlobalConfigurations hits the partner-theme endpoint', async () => {
    server.use(http.get('*/common/partner-theme', () => HttpResponse.json({ status: true, data: { theme: 'default' } })))
    await expect(fetchGlobalConfigurations()).resolves.toEqual({ status: true, data: { theme: 'default' } })
  })

  it('fetchAppConfigurations wraps the module name in the request body', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/app-configurations', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: {} })
      })
    )
    await fetchAppConfigurations('credit-builder')
    expect(receivedBody).toEqual({ module: 'credit-builder' })
  })

  it('saveAppConfigurations spreads settings alongside the module name', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/app-configurations/save', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true })
      })
    )
    await saveAppConfigurations('credit-builder', { min_score: 600 })
    expect(receivedBody).toEqual({ module: 'credit-builder', min_score: 600 })
  })

  it('fetchScoreConfigurations GETs and updateScoreConfigurations PUTs', async () => {
    server.use(http.get('*/admin/app-configuration/score', () => HttpResponse.json({ status: true, data: {} })))
    await expect(fetchScoreConfigurations()).resolves.toEqual({ status: true, data: {} })

    let receivedBody: unknown = null
    server.use(
      http.put('*/admin/app-configuration/score', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true })
      })
    )
    await updateScoreConfigurations({ min_score: 650 })
    expect(receivedBody).toEqual({ min_score: 650 })
  })

  it('updateTimeSettings PUTs the time_settings array', async () => {
    let receivedBody: unknown = null
    server.use(
      http.put('*/admin/app-configuration/time', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true })
      })
    )
    await updateTimeSettings({ time_settings: [{ key: 'session_timeout', value: '30' }] })
    expect(receivedBody).toEqual({ time_settings: [{ key: 'session_timeout', value: '30' }] })
  })

  it('fetchPartnerPaymentProviderConfig GETs by provider id', async () => {
    server.use(http.get('*/common/partner-payment-providers/9', () => HttpResponse.json({ status: true, data: { payment_provider_id: 9 } })))
    await expect(fetchPartnerPaymentProviderConfig(9)).resolves.toEqual({ status: true, data: { payment_provider_id: 9 } })
  })

  it('updatePartnerPaymentProviderStatus posts provider id and status', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/partner-payment-providers/status', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true })
      })
    )
    await updatePartnerPaymentProviderStatus({ payment_provider_id: 9, status: false })
    expect(receivedBody).toEqual({ payment_provider_id: 9, status: false })
  })
})
