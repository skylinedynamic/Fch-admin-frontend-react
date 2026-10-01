import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuthStore } from '../../../src/store/auth'
import { useIsHostPartner } from '../../../src/lib/auth/useIsHostPartner'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

describe('useIsHostPartner', () => {
  beforeEach(reset)
  afterEach(reset)

  it('is true for a host whose entity_type is Partner', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1, entity_type: 'Partner' } as never })
    expect(renderHook(() => useIsHostPartner()).result.current).toBe(true)
  })

  it('is true when is_host arrives as a boolean true', () => {
    useAuthStore.setState({ user: { id: 1, is_host: true, entity_type: 'Partner' } as never })
    expect(renderHook(() => useIsHostPartner()).result.current).toBe(true)
  })

  it('is false for a non-host partner', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 0, entity_type: 'Partner' } as never })
    expect(renderHook(() => useIsHostPartner()).result.current).toBe(false)
  })

  it('is false for a host whose entity_type is not Partner', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1, entity_type: 'Employee' } as never })
    expect(renderHook(() => useIsHostPartner()).result.current).toBe(false)
  })

  it('is false when signed out', () => {
    expect(renderHook(() => useIsHostPartner()).result.current).toBe(false)
  })
})
