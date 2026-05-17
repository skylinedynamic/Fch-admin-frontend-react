import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios'
import { toast } from 'react-toastify'
import { getToken, clearAuth } from '../auth'

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
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
    (config.headers as Record<string, string>)['X-Domain'] = window.location.hostname;
  }

  return config
})

// Global 401/403 handling: 401 => logout + redirect; 403 => toast only
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error?.response?.status

    // Toast for network connectivity issues (no response or network error)
    if (!error.response || (error.code && error.code === 'ERR_NETWORK')) {
      if (typeof window !== 'undefined') {
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
    } else if (status === 403) {
      // Forbidden: keep auth, show informative toast, do not redirect
      const serverMessage = (error.response?.data as any)?.message
      const message = serverMessage || 'You do not have permission to perform this action.'
      toast.error(message, { toastId: 'forbidden-error' })
    }
    return Promise.reject(error)
  }
)