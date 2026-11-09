import { toast } from 'react-toastify'
import {
  MAINTENANCE_DEFAULT_MESSAGE,
  MAINTENANCE_RELOAD_GUARD_MS,
  MAINTENANCE_RELOAD_KEY,
  MAINTENANCE_TOAST_ID,
} from '../../config/maintenance'

/**
 * Whether an API error body is the one the server's maintenance switch sends.
 * Any other 503 (Laravel's own `artisan down`, an overloaded server) has no
 * `maintenance: true` and is left to the normal error handling.
 */
export const isMaintenanceResponse = (data: unknown): boolean =>
  typeof data === 'object' && data !== null && (data as { maintenance?: unknown }).maintenance === true

/**
 * A tab that was already open when maintenance started: reload, so the server
 * serves its maintenance page (which brings the user back by itself once it
 * is over). At most once per guard window; inside it, show the message instead.
 * If the guard cannot be recorded (storage blocked), never reload - a reload
 * without it could loop.
 */
export const reloadForMaintenance = (message?: string): void => {
  const showMessage = () => toast.info(message || MAINTENANCE_DEFAULT_MESSAGE, { toastId: MAINTENANCE_TOAST_ID })

  try {
    const last = Number(sessionStorage.getItem(MAINTENANCE_RELOAD_KEY))
    if (last && Date.now() - last < MAINTENANCE_RELOAD_GUARD_MS) {
      showMessage()
      return
    }
    sessionStorage.setItem(MAINTENANCE_RELOAD_KEY, String(Date.now()))
  } catch {
    showMessage()
    return
  }

  window.location.reload()
}
