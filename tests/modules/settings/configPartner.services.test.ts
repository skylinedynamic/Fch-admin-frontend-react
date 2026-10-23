import { afterEach, describe, expect, it, vi } from 'vitest'
import { REFRESH_ACTIVITIES_EVENT } from '../../../src/config/appConfig'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchMailConfigurations,
  saveMailConfiguration,
  deleteMailConfiguration,
  makeDefaultMailConfiguration,
  sendMailConfigurationCode,
  verifyMailConfiguration,
  fetchSmsConfiguration,
  saveSmsConfiguration,
  sendTestSms,
  fetchAppConfigurations,
  saveAppConfigurations,
  fetchPartnerPaymentProviders,
  fetchPartnerPaymentProviderConfig,
  updatePartnerPaymentProviderConfig,
  updatePartnerPaymentProviderStatus,
} from '../../../src/modules/settings/services'

/**
 * Partner profile › Configuration edits another partner's settings through the
 * same services as the Settings page: given a partner id they name it with
 * `partner_id` (query on GET/DELETE, body on POST); without one they send
 * nothing extra, so the Settings page keeps working on the user's own partner.
 */
afterEach(() => server.resetHandlers())

type Seen = { query: string | null; body: any }

function capture(method: 'get' | 'post' | 'delete', path: string) {
  const seen: Seen = { query: null, body: undefined }
  server.use(
    http[method](`*${path}`, async ({ request }) => {
      seen.query = new URL(request.url).searchParams.get('partner_id')
      if (method === 'post') seen.body = await request.json().catch(() => ({}))
      return HttpResponse.json({ status: true, data: {} })
    })
  )
  return seen
}

describe('settings services › partner_id', () => {
  it.each([
    ['fetchMailConfigurations', '/common/mail-configurations', () => fetchMailConfigurations(42)],
    ['fetchSmsConfiguration', '/common/sms-configuration', () => fetchSmsConfiguration(42)],
    ['fetchPartnerPaymentProviders', '/common/partner-payment-providers', () => fetchPartnerPaymentProviders(42)],
    ['fetchPartnerPaymentProviderConfig', '/common/partner-payment-providers/7', () => fetchPartnerPaymentProviderConfig(7, 42)],
  ])('%s names the partner in the query', async (_name, path, call) => {
    const seen = capture('get', path)
    await call()
    expect(seen.query).toBe('42')
  })

  it('deleteMailConfiguration names the partner in the query', async () => {
    const seen = capture('delete', '/common/mail-configurations/5')
    await deleteMailConfiguration(5, 42)
    expect(seen.query).toBe('42')
  })

  it.each([
    ['saveMailConfiguration', '/common/mail-configurations', () => saveMailConfiguration({ provider: 'smtp' } as never, 42), { provider: 'smtp' }],
    ['makeDefaultMailConfiguration', '/common/mail-configurations/5/default', () => makeDefaultMailConfiguration(5, 42), {}],
    ['sendMailConfigurationCode', '/common/mail-configurations/5/send-code', () => sendMailConfigurationCode(5, 42), {}],
    ['verifyMailConfiguration', '/common/mail-configurations/5/verify', () => verifyMailConfiguration(5, '123456', 42), { code: '123456' }],
    ['saveSmsConfiguration', '/common/sms-configuration', () => saveSmsConfiguration({ country: 'USA' } as never, 42), { country: 'USA' }],
    ['sendTestSms', '/common/sms-configuration/test', () => sendTestSms({ phone: '+15005550006' }, 42), { phone: '+15005550006' }],
    ['fetchAppConfigurations', '/common/app-configurations', () => fetchAppConfigurations('branding', 42), { module: 'branding' }],
    ['saveAppConfigurations', '/common/app-configurations/save', () => saveAppConfigurations('branding', { primary_color: '#123456' }, 42), { module: 'branding', primary_color: '#123456' }],
    ['updatePartnerPaymentProviderConfig', '/common/partner-payment-providers', () => updatePartnerPaymentProviderConfig({ payment_provider_id: 1 } as never, 42), { payment_provider_id: 1 }],
    ['updatePartnerPaymentProviderStatus', '/common/partner-payment-providers/status', () => updatePartnerPaymentProviderStatus({ payment_provider_id: 1, status: true }, 42), { payment_provider_id: 1, status: true }],
  ])('%s names the partner in the body', async (_name, path, call, body) => {
    const seen = capture('post', path)
    await call()
    expect(seen.body).toEqual({ ...body, partner_id: 42 })
  })

  // The partner profile's activity sidebar listens for this and reloads, so the
  // logged change shows straight away.
  it('a change made for a partner tells the activity sidebar to reload; reads and own changes do not', async () => {
    const heard = vi.fn()
    window.addEventListener(REFRESH_ACTIVITIES_EVENT, heard)
    try {
      capture('post', '/common/sms-configuration')
      capture('get', '/common/sms-configuration')
      capture('post', '/common/app-configurations/save')
      capture('delete', '/common/mail-configurations/5')
      capture('post', '/common/partner-payment-providers/status')

      await fetchSmsConfiguration(42)
      await saveSmsConfiguration({ country: 'USA' } as never)
      expect(heard).not.toHaveBeenCalled()

      await saveSmsConfiguration({ country: 'USA' } as never, 42)
      await saveAppConfigurations('branding', {}, 42)
      await deleteMailConfiguration(5, 42)
      await updatePartnerPaymentProviderStatus({ payment_provider_id: 1, status: true }, 42)
      expect(heard).toHaveBeenCalledTimes(4)
    } finally {
      window.removeEventListener(REFRESH_ACTIVITIES_EVENT, heard)
    }
  })

  it('a refused change does not reload the activity', async () => {
    const heard = vi.fn()
    window.addEventListener(REFRESH_ACTIVITIES_EVENT, heard)
    server.use(http.post('*/common/sms-configuration', () => HttpResponse.json({ status: false }, { status: 422 })))
    try {
      await expect(saveSmsConfiguration({ country: 'USA' } as never, 42)).rejects.toBeTruthy()
      expect(heard).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener(REFRESH_ACTIVITIES_EVENT, heard)
    }
  })

  it('sends nothing extra without a partner id - the Settings page is unchanged', async () => {
    const get = capture('get', '/common/sms-configuration')
    await fetchSmsConfiguration()
    expect(get.query).toBeNull()

    const post = capture('post', '/common/app-configurations/save')
    await saveAppConfigurations('branding', { primary_color: '#123456' })
    expect(post.body).toEqual({ module: 'branding', primary_color: '#123456' })
  })
})
