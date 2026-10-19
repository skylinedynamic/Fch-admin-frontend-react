import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { queryKeys } from '../../../src/lib/query/queryKeys'
import {
  useAppConfigurations,
  useGlobalConfigurations,
  useMailConfigurations,
  useMakeDefaultMailConfiguration,
  useSaveAppConfigurations,
  useSaveMailConfiguration,
  useSaveSmsConfiguration,
  useScoreConfigurations,
  useSendTestMail,
  useSendTestSms,
  useSmsConfiguration,
  useTimeSettings,
  useUpdateScoreConfigurations,
  useUpdateTimeSettings,
} from '../../../src/modules/settings/queries'
import { createTestQueryClient } from '../../test-utils'
import { expectIdle, runMutation, runQuery, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

describe('settings read hooks', () => {
  it('useGlobalConfigurations reads the partner theme', async () => {
    const seen = stub('get', '/common/partner-theme', { status: true, data: { site_name: 'FCF' } })

    const { queryClient } = await runQuery(() => useGlobalConfigurations())

    expect(seen.calls).toBe(1)
    expect((queryClient.getQueryData(['globalConfigurations']) as any).data.site_name).toBe('FCF')
  })

  it('useMailConfigurations reads the mail configurations', async () => {
    const seen = stub('get', '/common/mail-configurations', { status: true, data: { configurations: [{ id: 1 }] } })

    const { queryClient } = await runQuery(() => useMailConfigurations())

    expect(seen.calls).toBe(1)
    expect(queryClient.getQueryData(queryKeys.settings.mailConfigurations())).toBeTruthy()
  })

  it('useAppConfigurations asks for one module and caches per module', async () => {
    const seen = stub('post', '/common/app-configurations', { status: true, data: { key: 'value' } })

    const { queryClient } = await runQuery(() => useAppConfigurations('branding'))

    expect(seen.bodies[0]).toEqual({ module: 'branding' })
    expect(queryClient.getQueryData(['appConfigurations', 'branding'])).toBeDefined()
  })

  it('useScoreConfigurations and useTimeSettings read the host configuration', async () => {
    const score = stub('get', '/admin/app-configuration/score', { status: true, data: {} })
    const time = stub('get', '/admin/app-configuration/time', { status: true, data: [] })

    await runQuery(() => useScoreConfigurations())
    await runQuery(() => useTimeSettings())

    expect(score.calls).toBe(1)
    expect(time.calls).toBe(1)
  })

  it('useSmsConfiguration caches under the shared settings key', async () => {
    stub('get', '/common/sms-configuration', { status: true, data: { provider: 'twilio' } })

    const { queryClient } = await runQuery(() => useSmsConfiguration())

    expect((queryClient.getQueryData(queryKeys.settings.smsConfiguration()) as any).data.provider).toBe('twilio')
  })

  it('every read hook can be switched off', () => {
    expectIdle(() => useGlobalConfigurations(false))
    expectIdle(() => useMailConfigurations(false))
    expectIdle(() => useAppConfigurations('branding', false))
    expectIdle(() => useScoreConfigurations(false))
    expectIdle(() => useTimeSettings(false))
    expectIdle(() => useSmsConfiguration(false))
  })

  it('useAppConfigurations stays idle without a module name', () => {
    expectIdle(() => useAppConfigurations(''))
  })
})

describe('settings write hooks', () => {
  it('useSaveMailConfiguration refreshes the mail and the global configuration', async () => {
    const seen = stub('post', '/common/mail-configurations', { status: true })
    const payload = { provider: 'smtp', from_address: 'mail@x.com', smtp_host: 'smtp.x.com' }

    const { invalidated } = await runMutation(() => useSaveMailConfiguration(), payload)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.settings.mailConfigurations(), ['globalConfigurations']])
  })

  it('useMakeDefaultMailConfiguration switches the sending provider and refreshes both', async () => {
    const seen = stub('post', '/common/mail-configurations/7/default', { status: true })

    const { invalidated } = await runMutation(() => useMakeDefaultMailConfiguration(), 7)

    expect(seen.calls).toBe(1)
    expect(invalidated).toEqual([queryKeys.settings.mailConfigurations(), ['globalConfigurations']])
  })

  it('useSaveAppConfigurations flattens the settings next to the module name', async () => {
    const seen = stub('post', '/common/app-configurations/save', { status: true })

    const { invalidated } = await runMutation(() => useSaveAppConfigurations(), { module: 'branding', settings: { primary_color: '#fff' } })

    expect(seen.bodies[0]).toEqual({ module: 'branding', primary_color: '#fff' })
    expect(invalidated).toEqual([['appConfigurations', 'branding'], ['globalConfigurations']])
  })

  it('useUpdateScoreConfigurations puts the scores and refreshes them', async () => {
    const seen = stub('put', '/admin/app-configuration/score', { status: true })

    const { invalidated } = await runMutation(() => useUpdateScoreConfigurations(), { fico_weight: 40 })

    expect(seen.bodies[0]).toEqual({ fico_weight: 40 })
    expect(invalidated).toEqual([['scoreConfigurations']])
  })

  it('useUpdateTimeSettings puts the time settings and refreshes them', async () => {
    const seen = stub('put', '/admin/app-configuration/time', { status: true })
    const payload = { time_settings: [{ day: 'mon', start: '09:00' }] }

    const { invalidated } = await runMutation(() => useUpdateTimeSettings(), payload)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([['timeSettings']])
  })

  it('useSaveSmsConfiguration writes the response into the cache instead of refetching', async () => {
    const response = { status: true, data: { provider: 'twilio', is_active: true } }
    stub('post', '/common/sms-configuration', response)
    const queryClient = createTestQueryClient()

    const { invalidated } = await runMutation(() => useSaveSmsConfiguration(), { provider: 'twilio' } as never, queryClient)

    expect(queryClient.getQueryData(queryKeys.settings.smsConfiguration())).toEqual(response)
    expect(invalidated).toEqual([])
  })

  it('useSendTestMail posts the recipient and body', async () => {
    const seen = stub('post', '/notifications/test-email', { status: true, message: 'sent' })
    const payload = { email: 'qa@x.com', body: 'Hello' }

    const { outcome } = await runMutation(() => useSendTestMail(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(outcome).toMatchObject({ message: 'sent' })
  })

  it('useSendTestSms posts to the SMS test endpoint', async () => {
    const seen = stub('post', '/common/sms-configuration/test', { status: true, message: 'sent' })
    const payload = { phone_number: '+15551234567', message: 'Hello' }

    await runMutation(() => useSendTestSms(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
  })

  it('a failed save does not touch the cache', async () => {
    stub('post', '/common/mail-configurations', { status: false, message: 'Invalid' }, 422)

    const { invalidated, error } = await runMutation(() => useSaveMailConfiguration(), { provider: 'smtp', from_address: '' })

    expect(error).toBeTruthy()
    expect(invalidated).toEqual([])
  })
})
