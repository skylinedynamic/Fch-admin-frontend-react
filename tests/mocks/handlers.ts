import type { HttpHandler } from 'msw'

/**
 * MSW request handlers. Empty until a phase adds handlers for the endpoints
 * it covers — keeps unhandled requests failing loudly (see
 * onUnhandledRequest: 'error' in tests/setup.ts) rather than silently
 * hitting the network.
 */
export const handlers: HttpHandler[] = []
