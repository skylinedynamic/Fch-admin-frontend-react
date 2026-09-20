import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  useAuthStore,
  getAuthState,
  setAuthState,
  clearAuthState,
  setUserSubscriptionState,
  getUserSubscriptionState,
} from '../../../src/store/auth/authStore'

const resetStore = () => {
  useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })
  localStorage.clear()
}

describe('authStore', () => {
  beforeEach(resetStore)
  afterEach(resetStore)

  it('setCredentials sets token, user, and rememberMe', () => {
    const user = { id: 1, name: 'Admin User', email: 'admin@example.com' }
    useAuthStore.getState().setCredentials({ token: 'abc123', user, rememberMe: false })

    const state = useAuthStore.getState()
    expect(state.token).toBe('abc123')
    expect(state.user).toEqual(user)
    expect(state.rememberMe).toBe(false)
  })

  it('setUserSubscription updates only the subscription field', () => {
    useAuthStore.getState().setUserSubscription({ subscription_status: 'active' })
    expect(useAuthStore.getState().userSubscription).toEqual({ subscription_status: 'active' })
  })

  it('clearCredentials resets token/user but leaves userSubscription and rememberMe untouched', () => {
    useAuthStore.getState().setCredentials({ token: 'abc123', user: { id: 1 }, rememberMe: false })
    useAuthStore.getState().setUserSubscription({ subscription_status: 'active' })

    useAuthStore.getState().clearCredentials()

    const state = useAuthStore.getState()
    expect(state.token).toBeUndefined()
    expect(state.user).toBeNull()
    // Deliberately different from the sibling fch-borrower-react repo, where
    // clearCredentials also resets userSubscription — verified against this
    // app's actual authStore.ts rather than assumed symmetric.
    expect(state.userSubscription).toEqual({ subscription_status: 'active' })
    expect(state.rememberMe).toBe(false)
  })

  it('always persists token and user to localStorage regardless of rememberMe=false', () => {
    useAuthStore.getState().setCredentials({ token: 'abc123', user: { id: 1, name: 'Admin' }, rememberMe: false })

    const persisted = JSON.parse(localStorage.getItem('auth') || '{}')
    expect(persisted.state.token).toBe('abc123')
    expect(persisted.state.user).toEqual({ id: 1, name: 'Admin' })
    expect(persisted.state.rememberMe).toBe(false)
  })

  describe('non-hook helpers', () => {
    it('getAuthState mirrors the store state', () => {
      useAuthStore.getState().setCredentials({ token: 'xyz', user: { id: 5 }, rememberMe: true })
      expect(getAuthState()).toEqual({ token: 'xyz', user: { id: 5 }, rememberMe: true })
    })

    it('setAuthState writes credentials via the store', () => {
      setAuthState({ token: 'from-helper', user: { id: 9 }, rememberMe: true })
      expect(useAuthStore.getState().token).toBe('from-helper')
    })

    it('setUserSubscriptionState / getUserSubscriptionState round-trip', () => {
      setUserSubscriptionState({ subscription_status: 'trialing' })
      expect(getUserSubscriptionState()).toEqual({ subscription_status: 'trialing' })
    })

    it('clearAuthState clears credentials via the store', () => {
      setAuthState({ token: 'to-be-cleared', user: { id: 1 }, rememberMe: true })
      clearAuthState()

      const state = useAuthStore.getState()
      expect(state.token).toBeUndefined()
      expect(state.user).toBeNull()
    })
  })
})
