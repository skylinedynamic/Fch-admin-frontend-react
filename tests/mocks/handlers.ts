import { http, HttpResponse, type HttpHandler } from 'msw'

/**
 * MSW request handlers. Empty until a phase adds handlers for the endpoints
 * it covers — keeps unhandled requests failing loudly (see
 * onUnhandledRequest: 'error' in tests/setup.ts) rather than silently
 * hitting the network.
 */
export const handlers: HttpHandler[] = [
  // The layout (header bell + sidebar "Notification" badge) loads the latest
  // notifications - and the unread count in their meta - on every page. Default
  // it to empty so tests that render the layout for something else don't need
  // to; notification tests override it with server.use().
  http.get('*/common/notifications', () =>
    HttpResponse.json({ status: true, data: [], meta: { current_page: 1, last_page: 1, per_page: 5, total: 0, unread_count: 0 } })
  ),
]
