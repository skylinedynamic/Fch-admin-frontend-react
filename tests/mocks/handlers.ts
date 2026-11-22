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
  // The host's partner filter (usePartnerOptions) loads on the Partners, Leads,
  // Clients, Commissions, Verification Center and Change Requests screens.
  // Default it to empty; partner-filter tests override it with server.use().
  http.post('*/common/get-all-partners', () => HttpResponse.json({ status: true, data: [] })),

  // Calendly v2 defaults: the host has not set up the Calendly app, nobody can
  // host a booking, no open times. Calendly tests override these with server.use().
  http.get('*/common/calendly/connection', () =>
    HttpResponse.json({ status: true, data: { app_configured: false, connected: false, needs_reconnect: false } })
  ),
  http.post('*/common/calendly/booking-options', () =>
    HttpResponse.json({ status: true, data: { mode: 'none', host: null, event_types: [] } })
  ),
  http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [] })),
]
