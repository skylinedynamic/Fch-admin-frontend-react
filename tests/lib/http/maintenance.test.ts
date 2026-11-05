import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-toastify', () => ({
  toast: { info: vi.fn(), error: vi.fn() },
}))

import { toast } from 'react-toastify'
import { isMaintenanceResponse, reloadForMaintenance } from '../../../src/lib/http/maintenance'
import {
  MAINTENANCE_DEFAULT_MESSAGE,
  MAINTENANCE_RELOAD_GUARD_MS,
  MAINTENANCE_RELOAD_KEY,
  MAINTENANCE_TOAST_ID,
} from '../../../src/config/maintenance'

/**
 * Maintenance mode: while it is on, Nginx answers every API call with
 * 503 { maintenance: true } and every portal page with the static maintenance
 * page. A tab that is already open reloads once to land on that page. The
 * guard stops a reload loop if the API says maintenance but the portal page
 * still loads (e.g. only the API block has the switch).
 */
const reload = vi.fn()
const originalLocation = window.location

beforeEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, writable: true, value: { pathname: '/dashboard', reload } })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  sessionStorage.clear()
  Object.defineProperty(window, 'location', { configurable: true, writable: true, value: originalLocation })
})

describe('isMaintenanceResponse', () => {
  it('is true only for the body the maintenance switch sends', () => {
    expect(isMaintenanceResponse({ status: false, maintenance: true, message: 'Updating' })).toBe(true)
  })

  it.each([
    ['a Laravel "php artisan down" body', { message: 'Service Unavailable' }],
    ['maintenance false', { maintenance: false }],
    ['maintenance as a string', { maintenance: 'true' }],
    ['no body', null],
    ['an HTML error page', '<html>503</html>'],
  ])('is false for %s', (_label, body) => {
    expect(isMaintenanceResponse(body)).toBe(false)
  })
})

describe('reloadForMaintenance', () => {
  it('reloads the page so the server shows its maintenance page', () => {
    reloadForMaintenance('Updating')

    expect(reload).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(MAINTENANCE_RELOAD_KEY)).not.toBeNull()
    expect(toast.info).not.toHaveBeenCalled()
  })

  it('does not reload again within the guard window; it shows the message instead', () => {
    reloadForMaintenance('Updating')
    reload.mockClear()

    reloadForMaintenance('We are updating the platform.')

    expect(reload).not.toHaveBeenCalled()
    expect(toast.info).toHaveBeenCalledWith('We are updating the platform.', { toastId: MAINTENANCE_TOAST_ID })
  })

  it('falls back to a default message when the server sends none', () => {
    sessionStorage.setItem(MAINTENANCE_RELOAD_KEY, String(Date.now()))

    reloadForMaintenance(undefined)

    expect(toast.info).toHaveBeenCalledWith(MAINTENANCE_DEFAULT_MESSAGE, { toastId: MAINTENANCE_TOAST_ID })
  })

  it('reloads again once the guard window has passed', () => {
    sessionStorage.setItem(MAINTENANCE_RELOAD_KEY, String(Date.now() - MAINTENANCE_RELOAD_GUARD_MS - 1))

    reloadForMaintenance('Updating')

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('never reloads when the guard cannot be recorded (storage blocked)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    reloadForMaintenance('Updating')

    expect(reload).not.toHaveBeenCalled()
    expect(toast.info).toHaveBeenCalledWith('Updating', { toastId: MAINTENANCE_TOAST_ID })
  })
})
