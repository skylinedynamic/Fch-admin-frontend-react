import { afterEach, describe, expect, it, vi } from 'vitest'
import { hideAndDisposeModal } from '../../src/utils/bootstrapModal'

/**
 * E2E-018: components hid and then immediately disposed their Bootstrap modal
 * on unmount. dispose() nulls the instance's element while the hide
 * animation's queued callback still writes element.style, which throws an
 * uncaught "Cannot read properties of null (reading 'style')".
 */
function fakeModal() {
  return { hide: vi.fn(), dispose: vi.fn() }
}

afterEach(() => vi.useRealTimers())

describe('hideAndDisposeModal', () => {
  it('hides now but does not dispose until the hide has finished', () => {
    const el = document.createElement('div')
    const modal = fakeModal()

    hideAndDisposeModal(modal, el)

    expect(modal.hide).toHaveBeenCalledOnce()
    expect(modal.dispose).not.toHaveBeenCalled()

    el.dispatchEvent(new Event('hidden.bs.modal'))
    expect(modal.dispose).toHaveBeenCalledOnce()
  })

  it('still disposes when no hidden event comes (it was already closed)', () => {
    vi.useFakeTimers()
    const el = document.createElement('div')
    const modal = fakeModal()

    hideAndDisposeModal(modal, el)
    vi.advanceTimersByTime(1000)

    expect(modal.dispose).toHaveBeenCalledOnce()
  })

  it('disposes only once when both the event and the fallback fire', () => {
    vi.useFakeTimers()
    const el = document.createElement('div')
    const modal = fakeModal()

    hideAndDisposeModal(modal, el)
    el.dispatchEvent(new Event('hidden.bs.modal'))
    vi.advanceTimersByTime(1000)

    expect(modal.dispose).toHaveBeenCalledOnce()
  })

  it('tolerates a missing instance or element', () => {
    expect(() => hideAndDisposeModal(null, null)).not.toThrow()
    const modal = fakeModal()
    expect(() => hideAndDisposeModal(modal, null)).not.toThrow()
  })

  it('swallows errors from hide/dispose of an already torn-down instance', () => {
    const el = document.createElement('div')
    const modal = { hide: vi.fn(() => { throw new Error('gone') }), dispose: vi.fn(() => { throw new Error('gone') }) }
    expect(() => hideAndDisposeModal(modal, el)).not.toThrow()
    expect(() => el.dispatchEvent(new Event('hidden.bs.modal'))).not.toThrow()
  })
})
