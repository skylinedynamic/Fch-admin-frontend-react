import { test, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Settings for the live suite. Nothing here has a real credential as a
 * default: supply them through the environment or `.env.e2e`.
 */
export const LIVE = {
  /** Must be the same API the served build was compiled against (VITE_API_URL). */
  apiUrl: (process.env.E2E_API_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/+$/, ''),
  /** The host account - the default session for every spec that is not persona-specific. */
  email: process.env.E2E_HOST_EMAIL || process.env.E2E_ADMIN_EMAIL || '',
  password: process.env.E2E_HOST_PASSWORD || process.env.E2E_ADMIN_PASSWORD || '',
  /**
   * Specs that create, change or delete records only run when this is "1".
   * Leave it off against any database whose contents matter.
   */
  allowWrites: process.env.E2E_LIVE_ALLOW_WRITES === '1',
}

export const hasCredentials = () => Boolean(LIVE.email && LIVE.password)

/** Skips the calling test (or describe block) with a clear reason when the suite is not configured. */
export function requireCredentials() {
  test.skip(!hasCredentials(), 'Live suite not configured: set E2E_HOST_EMAIL and E2E_HOST_PASSWORD (see .env.e2e.example).')
}

export function requireWrites() {
  test.skip(!LIVE.allowWrites, 'Write tests are off: set E2E_LIVE_ALLOW_WRITES=1 to run them against a disposable database.')
}

/** The bearer token of the session saved by auth.setup.ts, read back from the app's persisted store. */
export async function sessionToken(page: Page): Promise<string> {
  await page.goto('/')
  const token = await page.evaluate(() => {
    try {
      return JSON.parse(window.localStorage.getItem('auth') || '{}')?.state?.token || ''
    } catch {
      return ''
    }
  })
  if (!token) throw new Error('No session token found - did auth.setup.ts run?')
  return token
}

/** Calls the real API directly, as the signed-in user. */
export async function api(request: APIRequestContext, token: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, data?: unknown) {
  return request.fetch(`${LIVE.apiUrl}${path}`, {
    method,
    data,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    failOnStatusCode: false,
  })
}

export type ApiFailure = { url: string; status: number; method: string }

/**
 * Records every API response with a 5xx status while the page is used. A
 * screen that renders but silently swallowed a server error is still broken.
 */
export function trackServerErrors(page: Page): ApiFailure[] {
  const failures: ApiFailure[] = []
  page.on('response', (response) => {
    if (!response.url().startsWith(LIVE.apiUrl)) return
    if (response.status() >= 500) {
      failures.push({ url: response.url(), status: response.status(), method: response.request().method() })
    }
  })
  return failures
}
