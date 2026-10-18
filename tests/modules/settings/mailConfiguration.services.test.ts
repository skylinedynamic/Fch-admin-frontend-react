import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchMailConfigurations,
  saveMailConfiguration,
  deleteMailConfiguration,
  makeDefaultMailConfiguration,
  sendMailConfigurationCode,
  verifyMailConfiguration,
  fetchFallbackMailConfiguration,
  saveFallbackMailConfiguration,
  sendFallbackMailCode,
  verifyFallbackMailConfiguration,
  makeDefaultFallbackMailConfiguration,
} from '../../../src/modules/settings/services'

afterEach(() => server.resetHandlers())

const ok = (data: unknown = null) => HttpResponse.json({ status: true, message: 'ok', data })

describe('mail configuration services', () => {
  it('fetchMailConfigurations GETs the partner providers with their status', async () => {
    const data = { configurations: [], providers: [], uses_own_configuration: false, fallback: { is_configured: true, is_verified: true }, can_manage_fallback: false }
    server.use(http.get('*/common/mail-configurations', () => ok(data)))

    await expect(fetchMailConfigurations()).resolves.toMatchObject({ data })
  })

  it('saveMailConfiguration posts the payload as-is', async () => {
    let received: unknown = null
    server.use(
      http.post('*/common/mail-configurations', async ({ request }) => {
        received = await request.json()
        return ok({ id: 1 })
      })
    )

    const payload = { provider: 'smtp', from_address: 'mail@acme.test', smtp_host: 'smtp.acme.test', smtp_password: '' }
    await saveMailConfiguration(payload)

    expect(received).toEqual(payload)
  })

  it('reaches each provider action by its id', async () => {
    const calls: string[] = []
    server.use(
      http.delete('*/common/mail-configurations/:id', ({ params }) => { calls.push(`delete ${params.id}`); return ok() }),
      http.post('*/common/mail-configurations/:id/default', ({ params }) => { calls.push(`default ${params.id}`); return ok() }),
      http.post('*/common/mail-configurations/:id/send-code', ({ params }) => { calls.push(`send ${params.id}`); return ok() }),
      http.post('*/common/mail-configurations/:id/verify', async ({ params, request }) => {
        calls.push(`verify ${params.id} ${(await request.json() as { code: string }).code}`)
        return ok()
      }),
    )

    await deleteMailConfiguration(4)
    await makeDefaultMailConfiguration(4)
    await sendMailConfigurationCode(4)
    await verifyMailConfiguration(4, '123456')

    expect(calls).toEqual(['delete 4', 'default 4', 'send 4', 'verify 4 123456'])
  })

  it('the fallback has its own endpoints, one configuration per provider like a partner', async () => {
    const calls: string[] = []
    server.use(
      http.get('*/common/mail-configurations/fallback', () => {
        calls.push('get')
        return ok({ configurations: [], providers: [], sending_id: null })
      }),
      http.post('*/common/mail-configurations/fallback', () => { calls.push('save'); return ok() }),
      http.post('*/common/mail-configurations/fallback/:id/default', ({ params }) => { calls.push(`default ${params.id}`); return ok() }),
      http.post('*/common/mail-configurations/fallback/:id/send-code', ({ params }) => { calls.push(`send ${params.id}`); return ok() }),
      http.post('*/common/mail-configurations/fallback/:id/verify', async ({ params, request }) => {
        calls.push(`verify ${params.id} ${(await request.json() as { code: string }).code}`)
        return ok()
      }),
    )

    const fallback = await fetchFallbackMailConfiguration()
    await saveFallbackMailConfiguration({ provider: 'smtp', from_address: 'noreply@fch.test' })
    await makeDefaultFallbackMailConfiguration(7)
    await sendFallbackMailCode(7)
    await verifyFallbackMailConfiguration(7, '654321')

    expect(fallback.data).toEqual({ configurations: [], providers: [], sending_id: null })
    expect(calls).toEqual(['get', 'save', 'default 7', 'send 7', 'verify 7 654321'])
  })
})
