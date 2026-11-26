import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios'
import { toast } from 'react-toastify'
import { getToken, clearAuth, markPasswordChangeRequired } from '../auth'
import { MAINTENANCE_HTTP_STATUS } from '../../config/maintenance'
import { FORCE_PASSWORD_ROUTE, PASSWORD_CHANGE_REQUIRED_CODE } from '../../config/passwordChange'
import { isMaintenanceResponse, reloadForMaintenance } from './maintenance'

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    Accept: 'application/json',
  },
})

// Attach Authorization, Timezone, and Domain headers
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken()
  config.headers = config.headers || {}

  if (token) {
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`
  }

  // Pass user timezone and current portal domain via headers
  if (typeof window !== 'undefined') {
    (config.headers as Record<string, string>)['X-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  return config
})

// Endpoints that must never trigger a refresh check themselves — checking
// after their own responses would recurse (user-details/refresh-user) or
// fire before a token even exists (auth endpoints).
const REFRESH_CHECK_EXCLUDED_PATHS = [
  '/common/user-details',
  '/common/refresh-user',
  '/auth/login',
  '/auth/logout',
  '/auth/forgot',
  '/auth/reset',
]

let refreshCheckInFlight = false

// Whenever a role's/user's permissions change on the backend, `is_refresh`
// is flagged on the user row. Rather than waiting for the next page load,
// check for that flag after every authenticated API call and, if set, pull
// fresh permissions immediately (getUserDetails() itself calls refresh-user
// when needed). Concurrent requests are coalesced into a single check.
function triggerUserRefreshCheck(url?: string) {
  if (!url || refreshCheckInFlight) return
  if (REFRESH_CHECK_EXCLUDED_PATHS.some((path) => url.includes(path))) return
  if (!getToken()) return

  refreshCheckInFlight = true
  import('../auth/authApi')
    .then(({ getUserDetails }) => getUserDetails())
    .catch(() => {})
    .finally(() => {
      refreshCheckInFlight = false
    })
}

// Global 401/403 handling: 401 => logout + redirect; 403 => toast only
apiClient.interceptors.response.use(
  (response) => {
    triggerUserRefreshCheck(response.config?.url)
    return response
  },
  (error: AxiosError) => {
    const status = error?.response?.status

    // Maintenance mode: the whole platform is down on purpose. Reload onto the
    // server's maintenance page; no error toast, no logout.
    if (status === MAINTENANCE_HTTP_STATUS && isMaintenanceResponse(error.response?.data)) {
      reloadForMaintenance((error.response?.data as { message?: string })?.message)
      return Promise.reject(error)
    }

    const skipToast = (error.config as any)?._skipToast

    // Toast for network connectivity issues (no response or network error)
    if (!error.response || (error.code && error.code === 'ERR_NETWORK')) {
      if (typeof window !== 'undefined' && !skipToast) {
        const offline = typeof navigator !== 'undefined' && !navigator.onLine
        const message = offline
          ? 'You appear to be offline. Please reconnect and try again.'
          : 'Network error: Unable to reach the server. Please try again later.'
        toast.error(message, { toastId: 'network-error' })
      }
    }

    if (status === 401) {
      // Unauthorized: clear auth and redirect to login
      clearAuth()
      if (typeof window !== 'undefined') {
        const current = window.location.pathname
        if (current !== '/login') {
          window.location.assign('/login')
        }
      }
    } else if (status === 403 && (error.response?.data as { code?: string } | undefined)?.code === PASSWORD_CHANGE_REQUIRED_CODE) {
      // Signed in with an issued password: the server holds every call until
      // they choose their own. Straight to the Set password screen, no toast.
      markPasswordChangeRequired()
      if (typeof window !== 'undefined' && window.location.pathname !== FORCE_PASSWORD_ROUTE) {
        window.location.assign(FORCE_PASSWORD_ROUTE)
      }
    } else if (status === 403) {
      // Forbidden: keep auth, show informative toast, do not redirect
      if (!skipToast) {
        const serverMessage = (error.response?.data as any)?.message
        const message = serverMessage || 'You do not have permission to perform this action.'
        toast.error(message, { toastId: 'forbidden-error' })
      }
    }
    return Promise.reject(error)
  }
)