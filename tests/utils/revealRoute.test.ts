import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { revealRoute } from '../../src/utils/revealRoute'

// "Take Me There" must show what it points at: the page from the top, and the
// sidebar entry for it in view - even when the target is the page already open.
describe('revealRoute', () => {
  let scrollTo: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    scrollTo = vi.fn()
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo
    document.body.innerHTML = `
      <div id="scrollbar">
        <a class="nav-link" href="/">Dashboard</a>
        <a class="nav-link active" href="/settings">Settings</a>
      </div>`
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('scrolls the page smoothly to the top once the route has rendered', () => {
    revealRoute()
    expect(scrollTo).not.toHaveBeenCalled()

    vi.runAllTimers()

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('brings the active sidebar link into view', () => {
    const active = document.querySelector<HTMLElement>('#scrollbar .active')!
    active.scrollIntoView = vi.fn()

    revealRoute()
    vi.runAllTimers()

    expect(active.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' })
  })

  it('still scrolls the page when no sidebar link is active', () => {
    document.body.innerHTML = '<div id="scrollbar"><a class="nav-link" href="/">Dashboard</a></div>'

    revealRoute()
    vi.runAllTimers()

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
