import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'

const echoInstances: Array<{ options: any; disconnect: ReturnType<typeof vi.fn> }> = []

vi.mock('laravel-echo', () => ({
  default: vi.fn().mockImplementation(function (this: any, options: any) {
    const instance = { options, disconnect: vi.fn() }
    echoInstances.push(instance)
    return instance
  }),
}))

import { getEcho, disconnectEcho, userChannelName } from '../../../src/lib/realtime/echo'
import { setAuthState, clearAuthState } from '../../../src/store/auth'

describe('realtime echo connection', () => {
  beforeEach(() => {
    echoInstances.length = 0
    vi.stubEnv('VITE_REVERB_APP_KEY', 'app-key')
    vi.stubEnv('VITE_REVERB_HOST', 'ws.example.test')
    vi.stubEnv('VITE_REVERB_PORT', '443')
    vi.stubEnv('VITE_REVERB_SCHEME', 'https')
    setAuthState({ token: 'token-1', user: null })
  })

  afterEach(() => {
    disconnectEcho()
    clearAuthState()
    vi.unstubAllEnvs()
  })

  it('returns null without a signed-in user', () => {
    clearAuthState()
    expect(getEcho()).toBeNull()
    expect(echoInstances).toHaveLength(0)
  })

  it('returns null when Reverb is not configured', () => {
    vi.stubEnv('VITE_REVERB_APP_KEY', '')
    expect(getEcho()).toBeNull()
  })

  it('creates one shared connection configured for Reverb', () => {
    const first = getEcho()
    const second = getEcho()

    expect(first).toBe(second)
    expect(echoInstances).toHaveLength(1)
    expect(echoInstances[0].options).toMatchObject({
      broadcaster: 'reverb',
      key: 'app-key',
      wsHost: 'ws.example.test',
      wsPort: 443,
      wssPort: 443,
      forceTLS: true,
      enabledTransports: ['ws', 'wss'],
    })
  })

  it('replaces the connection when the signed-in token changes', () => {
    const first = getEcho()
    setAuthState({ token: 'token-2' })
    const second = getEcho()

    expect(second).not.toBe(first)
    expect(echoInstances[0].disconnect).toHaveBeenCalledTimes(1)
  })

  it('disconnectEcho closes the socket and forgets it', () => {
    getEcho()
    disconnectEcho()

    expect(echoInstances[0].disconnect).toHaveBeenCalledTimes(1)
    getEcho()
    expect(echoInstances).toHaveLength(2)
  })

  it('authorizes private channels through the API with the current token', async () => {
    let received: { body: any; auth: string | null } | null = null
    server.use(
      http.post('*/broadcasting/auth', async ({ request }) => {
        received = { body: await request.json(), auth: request.headers.get('authorization') }
        return HttpResponse.json({ auth: 'signed' })
      })
    )
    getEcho()

    const result = await new Promise<{ error: unknown; data: unknown }>((resolve) => {
      echoInstances[0].options
        .authorizer({ name: 'private-App.Models.User.5' })
        .authorize('123.456', (error: unknown, data: unknown) => resolve({ error, data }))
    })

    expect(result).toEqual({ error: null, data: { auth: 'signed' } })
    expect(received).toEqual({
      body: { socket_id: '123.456', channel_name: 'private-App.Models.User.5' },
      auth: 'Bearer token-1',
    })
  })

  it('names the per-user private channel the backend authorizes', () => {
    expect(userChannelName(5)).toBe('App.Models.User.5')
  })
})
