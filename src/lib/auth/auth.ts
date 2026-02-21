// Auth utilities backed by Zustand store with persist
import { getAuthState, setAuthState, clearAuthState, AuthUser, setUserSubscriptionState, UserSubscription, getUserSubscriptionState } from '../../store/auth'
import { getUserDetails, refreshUser } from './authApi'

const COOKIE_NAME = 'auth_session_active'

function setCookie(name: string, value: string, days?: number) {
  let expires = ''
  if (days) {
    const date = new Date()
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
    expires = '; expires=' + date.toUTCString()
  }
  document.cookie = name + '=' + (value || '') + expires + '; path=/'
}

function getCookie(name: string) {
  const nameEQ = name + '='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

function eraseCookie(name: string) {
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
}

export type { AuthUser, UserSubscription }

export function getToken(): string {
  const { token } = getAuthState()
  return token || ''
}

export function getUser(): AuthUser | null {
  const { user } = getAuthState()
  return (user as AuthUser | null) ?? null
}


export function setUserSubscription(subscription: UserSubscription | null): void {
  setUserSubscriptionState(subscription)
}

export function getUserSubscription(): UserSubscription | null {
  return getUserSubscriptionState() ?? null
}


export function setAuth(token?: string | null, user?: AuthUser | null, rememberMe: boolean = true): void {
  setAuthState({ token: token || undefined, user: user ?? null, rememberMe })

  if (token) {
    if (rememberMe) {
      // Persistent cookie (e.g., 60 days)
      setCookie(COOKIE_NAME, 'true', 60)
    } else {
      // Session cookie (cleared on browser close)
      setCookie(COOKIE_NAME, 'true')
    }
  } else {
    eraseCookie(COOKIE_NAME)
  }
}

export function clearAuth(): void {
  clearAuthState()
  eraseCookie(COOKIE_NAME)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function checkSession(): void {
  const { token } = getAuthState()
  const sessionActive = getCookie(COOKIE_NAME)

  // If we have a token but no session cookie, it means the browser was closed
  // and we should log the user out (unless rememberMe was true, in which case the cookie should have persisted)
  // However, since we set the cookie expiry based on rememberMe, existence of cookie is the source of truth for "should stay logged in"

  // Edge case: If user manually cleared cookies but localStorage remains.
  // Or if session cookie expired (browser closed).

  if (token && !sessionActive) {
    clearAuth()
  }
}

export async function refreshSubscription(): Promise<void> {
  if (!isAuthenticated()) return

  try {
    const response = await getUserDetails()
    if (response?.status && response?.data?.user) {
      // Update store, keep existing token
      const user = response.data.user
      setUserSubscription({
        enrollment_type: user.enrollment_type,
        subscription_status: user.subscription_status,
        first_payment_date: user.first_payment_date,
        platform_fee_start_date: user.platform_fee_start_date,
        next_installment_date: user.next_installment_date,
        next_platform_fee_date: user.next_platform_fee_date,
        enrollment_completed_at: user.enrollment_completed_at,
        subscription_start_date: user.subscription_start_date,
        subscription_end_date: user.subscription_end_date,
        phase: user.phase,
        is_host: user.is_host
      })
    }
  } catch (error) {
    console.error("Failed to refresh user details", error)
  }
}

export async function refreshUserData(): Promise<void> {
  if (!isAuthenticated()) return

  try {
    await refreshUser()
  } catch (error) {
    console.error("Failed to refresh user data", error)
  }
}

