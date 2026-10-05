import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
import { server } from './mocks/server'

// Matches vitest.config.ts's testTimeout — a full suite run spins up many
// concurrent jsdom/MSW environments, and under that CPU contention findBy/
// waitFor's 1000ms default can get timer-starved even when nothing's broken.
configure({ asyncUtilTimeout: 5000 })

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  cleanup()
})
afterAll(() => server.close())

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList
}

if (!window.ResizeObserver) {
  class MockResizeObserver implements ResizeObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
}

if (!window.IntersectionObserver) {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null
    readonly rootMargin: string = ''
    readonly thresholds: ReadonlyArray<number> = []
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
}

// jsdom doesn't implement layout, so it has no scrollIntoView at all —
// components that auto-scroll to the latest message (e.g. SupportChatWidget)
// throw "scrollIntoView is not a function" the instant they mount in a test.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}

// jsdom's Blob implementation has no `.stream()`. undici — which MSW uses to
// build Response bodies — calls `object.stream()` on anything blob-like, so a
// handler returning `new HttpResponse(new Blob([...]))` dies with
// "object.stream is not a function". Node 24's undici tolerates the omission,
// Node 22's does not, which is why this only bites on the older runtime.
// Patch the method in rather than swapping the global for Node's native Blob,
// so jsdom's Blob identity — and `expect(x).toBeInstanceOf(Blob)` — still holds.
if (typeof Blob !== 'undefined' && typeof Blob.prototype.stream !== 'function') {
  Blob.prototype.stream = function stream(this: Blob): ReadableStream<Uint8Array<ArrayBuffer>> {
    const blob = this
    return new ReadableStream<Uint8Array<ArrayBuffer>>({
      async start(controller) {
        controller.enqueue(new Uint8Array(await blob.arrayBuffer()))
        controller.close()
      },
    })
  }
}
