import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

vi.mock('../../../src/lib/auth', () => ({
  getToken: vi.fn(() => ''),
  clearAuth: vi.fn(),
}))
vi.mock('../../../src/lib/auth/authApi', () => ({
  getUserDetails: vi.fn(() => Promise.resolve({ status: true, data: { user: {} } })),
}))
vi.mock('react-toastify', () => ({
  toast: { error: vi.fn() },
}))

import { getToken } from '../../../src/lib/auth'
import { getUserDetails } from '../../../src/lib/auth/authApi'
import { toast } from 'react-toastify'
import { clearAuth } from '../../../src/lib/auth'
import { apiClient } from '../../../src/lib/http/apiClient'

// axios exposes registered interceptors via this internal `handlers` array;
// invoking them directly tests the interceptor logic without a live request.
const requestInterceptor = (apiClient.interceptors.request as any).handlers[0]
const responseInterceptor = (apiClient.interceptors.response as any).handlers[0]

const makeConfig = (headers: Record<string, string> = {}, extra: Record<string, unknown> = {}): InternalAxiosRequestConfig =>
  ({ headers, ...extra } as InternalAxiosRequestConfig)

const makeError = (overrides: Partial<AxiosError> = {}): AxiosError =>
  ({ config: makeConfig(), ...overrides } as AxiosError)

describe('apiClient request interceptor', () => {
  afterEach(() => vi.clearAllMocks())

  it('attaches the Bearer token when one is present', () => {
    vi.mocked(getToken).mockReturnValue('token-123')
    const config = requestInterceptor.fulfilled(makeConfig())
    expect(config.headers.Authorization).toBe('Bearer token-123')
  })

  it('omits the Authorization header when there is no token', () => {
    vi.mocked(getToken).mockReturnValue('')
    const config = requestInterceptor.fulfilled(makeConfig())
    expect(config.headers.Authorization).toBeUndefined()
  })

  it('always sets the X-Timezone header', () => {
    const config = requestInterceptor.fulfilled(makeConfig())
    expect(config.headers['X-Timezone']).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })
})

describe('apiClient response interceptor — success path (refresh check)', () => {
  beforeEach(() => vi.mocked(getToken).mockReturnValue('token-123'))
  afterEach(() => vi.clearAllMocks())

  it('triggers a background user-details refresh after a normal authenticated response', async () => {
    const response = { data: { ok: true }, config: makeConfig({}, { url: '/admin/partners/list' }) }
    expect(responseInterceptor.fulfilled(response)).toBe(response)

    await vi.waitFor(() => expect(getUserDetails).toHaveBeenCalled())
  })

  it.each(['/common/user-details', '/common/refresh-user', '/auth/login', '/auth/logout', '/auth/forgot', '/auth/reset'])(
    'does not trigger a refresh check for the excluded path %s',
    async (path) => {
      const response = { data: {}, config: makeConfig({}, { url: path }) }
      responseInterceptor.fulfilled(response)

      await new Promise((r) => setTimeout(r, 0))
      expect(getUserDetails).not.toHaveBeenCalled()
    }
  )

  it('does not trigger a refresh check when there is no token', async () => {
    vi.mocked(getToken).mockReturnValue('')
    const response = { data: {}, config: makeConfig({}, { url: '/admin/partners/list' }) }
    responseInterceptor.fulfilled(response)

    await new Promise((r) => setTimeout(r, 0))
    expect(getUserDetails).not.toHaveBeenCalled()
  })
})

describe('apiClient response interceptor — error path', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { pathname: '/dashboard', assign: vi.fn() },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: originalLocation })
  })

  it('toasts an offline message when the browser is offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const error = makeError({ code: 'ERR_NETWORK' })

    await expect(responseInterceptor.rejected(error)).rejects.toBe(error)

    expect(toast.error).toHaveBeenCalledWith('You appear to be offline. Please reconnect and try again.', {
      toastId: 'network-error',
    })
  })

  it('toasts an unreachable-server message when online but the network errors', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const error = makeError({ code: 'ERR_NETWORK' })

    await expect(responseInterceptor.rejected(error)).rejects.toBe(error)

    expect(toast.error).toHaveBeenCalledWith(
      'Network error: Unable to reach the server. Please try again later.',
      { toastId: 'network-error' }
    )
  })

  it('suppresses the network-error toast when config._skipToast is true', async () => {
    const error = makeError({ code: 'ERR_NETWORK', config: makeConfig({}, { _skipToast: true }) })
    await expect(responseInterceptor.rejected(error)).rejects.toBe(error)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('on 401: clears auth and redirects to /login', async () => {
    window.location.pathname = '/dashboard'
    const error = makeError({ response: { status: 401, data: {} } as any })

    await expect(responseInterceptor.rejected(error)).rejects.toBe(error)

    expect(clearAuth).toHaveBeenCalled()
    expect(window.location.assign).toHaveBeenCalledWith('/login')
  })

  it('on 401: does not redirect again when already on /login (no redirect loop)', async () => {
    window.location.pathname = '/login'
    const error = makeError({ response: { status: 401, data: {} } as any })

    await expect(responseInterceptor.rejected(error)).rejects.toBe(error)

    expect(clearAuth).toHaveBeenCalled()
    expect(window.location.assign).not.toHaveBeenCalled()
  })

  it('on 403: shows the server message and does not clear auth', async () => {
    const error = makeError({ response: { status: 403, data: { message: 'Not allowed' } } as any })

    await expect(responseInterceptor.rejected(error)).rejects.toBe(error)

    expect(clearAuth).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Not allowed', { toastId: 'forbidden-error' })
  })

  it('on 403: falls back to a generic message when the server sends none', async () => {
    const error = makeError({ response: { status: 403, data: {} } as any })

    await expect(responseInterceptor.rejected(error)).rejects.toBe(error)

    expect(toast.error).toHaveBeenCalledWith('You do not have permission to perform this action.', {
      toastId: 'forbidden-error',
    })
  })

  it('on 403: suppresses the toast when config._skipToast is true', async () => {
    const error = makeError({
      response: { status: 403, data: {} } as any,
      config: makeConfig({}, { _skipToast: true }),
    })

    await expect(responseInterceptor.rejected(error)).rejects.toBe(error)

    expect(toast.error).not.toHaveBeenCalled()
  })
})
