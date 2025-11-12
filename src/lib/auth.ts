// Lightweight auth utilities: token/user storage, read helpers, and logout
export const AUTH_TOKEN_KEY = 'auth_token'
export const AUTH_USER_KEY = 'auth_user'

export type AuthUser = {
  id?: string
  name?: string
  email?: string
  role?: string
  image?: string
  [key: string]: unknown
}

export function getToken(): string {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function setAuth(token?: string | null, user?: AuthUser | null): void {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token)
    if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  } catch {}
}

export function clearAuth(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
  } catch {}
}

export function isAuthenticated(): boolean {
  return !!getToken()
}