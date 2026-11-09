import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuthStore } from '../../../src/store/auth'
import { useIsHostOwner } from '../../../src/lib/auth/useIsHostOwner'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })
const signIn = (user: Record<string, unknown>) => useAuthStore.setState({ user: { id: 1, permissions: [], ...user } as never })
const isOwner = () => renderHook(() => useIsHostOwner()).result.current

// The same rule as fch-api CommissionViewer::HOST_OWNER: the host's own
// login, or host staff who manage commissions.
describe('useIsHostOwner', () => {
  beforeEach(reset)
  afterEach(reset)

  it("is true for the host partner's own login", () => {
    signIn({ is_host: 1, entity_type: 'Partner' })
    expect(isOwner()).toBe(true)
  })

  it('is true for host staff who may update commissions', () => {
    signIn({ is_host: 1, entity_type: 'Employee', permissions: ['update commission'] })
    expect(isOwner()).toBe(true)
  })

  it('is false for other host staff', () => {
    signIn({ is_host: 1, entity_type: 'Employee', permissions: ['view commission'] })
    expect(isOwner()).toBe(false)
  })

  it('is false for a partner, even one who may update commissions', () => {
    signIn({ is_host: 0, entity_type: 'Partner', permissions: ['update commission'] })
    expect(isOwner()).toBe(false)
  })

  it('is false when signed out', () => {
    expect(isOwner()).toBe(false)
  })
})
