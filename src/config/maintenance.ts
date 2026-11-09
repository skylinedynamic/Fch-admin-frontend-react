/**
 * Maintenance mode, switched on by hand on the server (sudo fch-maintenance on).
 * While it is on, Nginx answers every API call with this status and
 * `{ maintenance: true }`, and every portal page with the static maintenance
 * page, which reloads itself until maintenance is over.
 */
export const MAINTENANCE_HTTP_STATUS = 503

/**
 * A tab that is already open reloads once to land on the server's maintenance
 * page, but not again within this window: if the portal page still loads while
 * the API says maintenance, reloading again would only loop.
 */
export const MAINTENANCE_RELOAD_GUARD_MS = 60_000

/** sessionStorage key holding when the last maintenance reload happened. */
export const MAINTENANCE_RELOAD_KEY = 'fch-maintenance-reload-at'

/** Shown instead of reloading again inside the guard window. */
export const MAINTENANCE_DEFAULT_MESSAGE = 'We are updating the platform. Please try again in a few minutes.'
export const MAINTENANCE_TOAST_ID = 'maintenance'
