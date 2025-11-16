// Auth utilities backed by Zustand store with persist
import { getAuthState, setAuthState, clearAuthState } from '../../store/auth'

const SESSION_KEY = 'auth_session'

function readSession(): { token?: string; user?: AuthUser | null } {
  try {
    if (typeof window === 'undefined') return {}
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const token = typeof parsed?.token === 'string' ? parsed.token : undefined
    const user = parsed?.user ?? null
    return { token, user }
  } catch {
    return {}
  }
}

function writeSession(payload: { token?: string; user?: AuthUser | null }) {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota/storage errors
  }
}

function clearSession() {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

export type AuthUser = {
  id?: string
  name?: string
  email?: string
  role?: string
  image?: string
  permissions?: string[]
  [key: string]: unknown
}

export function getToken(): string {
  const { token, rememberMe } = getAuthState()
  if (token) return token
  if (rememberMe === false) {
    const fromSession = readSession().token
    return fromSession ?? ''
  }
  return ''
}

export function getUser(): AuthUser | null {
  const { user, rememberMe } = getAuthState()
  if (user) return user as AuthUser
  if (rememberMe === false) {
    const fromSession = readSession().user
    return (fromSession as AuthUser | null) ?? null
  }
  return null
}

export function setAuth(token?: string | null, user?: AuthUser | null, rememberMe: boolean = true): void {
  setAuthState({ token: token || undefined, user: user ?? null, rememberMe })
  if (rememberMe === false) {
    writeSession({ token: token || undefined, user: user ?? null })
  } else {
    // ensure no stale session data remains
    clearSession()
  }
}

export function clearAuth(): void {
  clearAuthState()
  clearSession()
}

export function isAuthenticated(): boolean {
  return !!getToken()
}