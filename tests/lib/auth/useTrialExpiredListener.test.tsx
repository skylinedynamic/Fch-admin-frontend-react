import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createFakeEcho, type FakeEcho } from '../../mocks/fakeEcho'
import { setAuthState, clearAuthState } from '../../../src/store/auth'
import { ENTITY_TYPE_BORROWER } from '../../../src/config/appConfig'

let fake: FakeEcho

vi.mock('../../../src/lib/realtime/echo', () => ({
  getEcho: () => fake.echo,
  disconnectEcho: () => {},
  userChannelName: (id: number | string) => `App.Models.User.${id}`,
}))

const { clearAuth } = vi.hoisted(() => ({ clearAuth: vi.fn() }))
vi.mock('../../../src/lib/auth/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/lib/auth/auth')>()),
  clearAuth,
}))

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { error: vi.fn(), info: vi.fn(), success: vi.fn() }) }
})

import { toast } from 'react-toastify'
import { useTrialExpiredListener } from '../../../src/lib/auth/useTrialExpiredListener'

const CHANNEL = 'App.Models.User.7'

describe('useTrialExpiredListener', () => {
  const assign = vi.fn()

  beforeEach(() => {
    fake = createFakeEcho()
    vi.stubGlobal('location', { ...window.location, assign })
  })

  afterEach(() => {
    clearAuthState()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('logs a partner out with the trial message when the trial expires', () => {
    setAuthState({ token: 't', user: { id: 7, entity_type: 'App\\Models\\Partner\\Partner' } as any })
    renderHook(() => useTrialExpiredListener())

    act(() => fake.emit(CHANNEL, '.trial.expired', {}))

    expect(clearAuth).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith('Your free trial has expired. You have been logged out.', { toastId: 'reverb-trial-expired' })
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('uses the free-plan message for a borrower', () => {
    setAuthState({ token: 't', user: { id: 7, entity_type: ENTITY_TYPE_BORROWER } as any })
    renderHook(() => useTrialExpiredListener())

    act(() => fake.emit(CHANNEL, '.trial.expired', {}))

    expect(toast.error).toHaveBeenCalledWith('Your free plan has expired. You have been logged out.', { toastId: 'reverb-trial-expired' })
  })

  it('only removes its own listener on unmount (the channel is shared)', () => {
    setAuthState({ token: 't', user: { id: 7 } as any })
    const other = vi.fn()
    fake.echo.private(CHANNEL).listen('.trial.expired', other)
    const { unmount } = renderHook(() => useTrialExpiredListener())
    expect(fake.listenerCount(CHANNEL, '.trial.expired')).toBe(2)

    unmount()

    expect(fake.listenerCount(CHANNEL, '.trial.expired')).toBe(1)
  })

  it('does nothing when signed out', () => {
    renderHook(() => useTrialExpiredListener())
    expect(fake.listenerCount(CHANNEL, '.trial.expired')).toBe(0)
  })
})
