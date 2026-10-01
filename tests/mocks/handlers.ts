import { http, HttpResponse, type HttpHandler } from 'msw'

/**
 * MSW request handlers. Empty until a phase adds handlers for the endpoints
 * it covers — keeps unhandled requests failing loudly (see
 * onUnhandledRequest: 'error' in tests/setup.ts) rather than silently
 * hitting the network.
 */
export const handlers: HttpHandler[] = [
  // The layout (header bell + sidebar "Notification" badge) asks for the unread
  // count on every page. Default it to 0 so tests that render the layout for
  // something else don't need to; notification tests override it with server.use().
  http.get('*/common/notifications/unread-count', () =>
    HttpResponse.json({ status: true, data: { unread_count: 0 } })
  ),
]
