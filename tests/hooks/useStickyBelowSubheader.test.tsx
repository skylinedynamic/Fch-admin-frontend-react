import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useStickyBelowSubheader } from '../../src/hooks/useStickyBelowSubheader'

function mountSubheader(top: string, height: number) {
  const bar = document.createElement('div')
  bar.className = 'page-subheader-sticky'
  bar.style.top = top
  Object.defineProperty(bar, 'offsetHeight', { configurable: true, value: height })
  document.body.appendChild(bar)
  return bar
}

describe('useStickyBelowSubheader', () => {
  afterEach(() => {
    document.querySelectorAll('.page-subheader-sticky').forEach((el) => el.remove())
    vi.unstubAllGlobals()
  })

  it("puts the card right under the page's sticky title bar", () => {
    mountSubheader('70px', 63)

    const { result } = renderHook(() => useStickyBelowSubheader('145px'))

    expect(result.current).toBe('133px')
  })

  it('uses the fallback on pages without such a bar', () => {
    const { result } = renderHook(() => useStickyBelowSubheader('145px'))

    expect(result.current).toBe('145px')
  })

  it('uses the fallback when sticky is turned off', () => {
    mountSubheader('70px', 63)

    const { result } = renderHook(() => useStickyBelowSubheader('145px', false))

    expect(result.current).toBe('145px')
  })

  it('follows the bar when it changes height', () => {
    let notify: () => void = () => { }
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: () => void) { notify = cb }
      observe() { }
      disconnect() { }
    })
    const bar = mountSubheader('70px', 63)

    const { result, rerender } = renderHook(() => useStickyBelowSubheader('145px'))
    Object.defineProperty(bar, 'offsetHeight', { configurable: true, value: 90 })
    notify()
    rerender()

    expect(result.current).toBe('160px')
  })
})
