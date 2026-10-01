import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../../../src/store/auth/authStore'
import { setAuth, clearAuth, isAuthenticated, checkSession, getToken, getUser } from '../../../src/lib/auth/auth'

const { disconnectEcho } = vi.hoisted(() => ({ disconnectEcho: vi.fn() }))
vi.mock('../../../src/lib/realtime/echo', () => ({ disconnectEcho, getEcho: () => null }))

const COOKIE_NAME = 'auth_session_active'

const clearAllCookies = () => {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim()
    if (name) document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`
  })
}

const reset = () => {
  useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })
  localStorage.clear()
  clearAllCookies()
}

describe('auth', () => {
  beforeEach(reset)
  afterEach(reset)

  describe('setAuth', () => {
    it('stores the token and user, and sets the session cookie', () => {
      setAuth('token-123', { id: 1, name: 'Admin' }, true)

      expect(getToken()).toBe('token-123')
      expect(getUser()).toEqual({ id: 1, name: 'Admin' })
      expect(document.cookie).toContain(`${COOKIE_NAME}=true`)
    })

    it('sets the session cookie even when rememberMe is false', () => {
      setAuth('token-123', { id: 1 }, false)
      expect(document.cookie).toContain(`${COOKIE_NAME}=true`)
    })

    it('erases the session cookie when called with no token', () => {
      setAuth('token-123', { id: 1 }, true)
      expect(document.cookie).toContain(COOKIE_NAME)

      setAuth(null, null)
      expect(document.cookie).not.toContain(`${COOKIE_NAME}=true`)
    })
  })

  describe('clearAuth', () => {
    it('clears the store token/user and erases the session cookie', () => {
      setAuth('token-123', { id: 1 }, true)

      clearAuth()

      expect(getToken()).toBe('')
      expect(getUser()).toBeNull()
      expect(document.cookie).not.toContain(`${COOKIE_NAME}=true`)
    })

    it('closes the real-time connection so the next user gets a fresh one', () => {
      setAuth('token-123', { id: 1 }, true)
      disconnectEcho.mockClear()

      clearAuth()

      expect(disconnectEcho).toHaveBeenCalledTimes(1)
    })
  })

  describe('isAuthenticated', () => {
    it('is false with no token and true once a token is set', () => {
      expect(isAuthenticated()).toBe(false)
      setAuth('token-123', { id: 1 })
      expect(isAuthenticated()).toBe(true)
    })
  })

  describe('checkSession', () => {
    it('logs the user out when a token exists but the session cookie is missing', () => {
      setAuth('token-123', { id: 1 }, true)
      // Simulate the browser having closed and the session cookie expiring
      document.cookie = `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`

      checkSession()

      expect(getToken()).toBe('')
    })

    it('leaves the session intact when the token and cookie both exist', () => {
      setAuth('token-123', { id: 1 }, true)

      checkSession()

      expect(getToken()).toBe('token-123')
    })

    it('is a no-op when there is no token', () => {
      checkSession()
      expect(getToken()).toBe('')
    })
  })
})
