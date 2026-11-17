import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { API_BASE_URL, SLOW_TIMEOUT } from './env'

/**
 * Logs in once through the real login form and saves the persisted auth store
 * (localStorage + session cookie) to `statePath`, so live specs start already
 * signed in instead of paying for a Passport login per test. Skips (leaving an
 * empty state) when the account is not configured or the backend is down.
 */
export async function signInAndSave(
  setup: { skip: (condition: boolean, description: string) => void; setTimeout: (ms: number) => void },
  page: Page,
  request: APIRequestContext,
  account: { email: string; password: string; envNames: string },
  statePath: string,
) {
  setup.setTimeout(120_000)
  mkdirSync(dirname(statePath), { recursive: true })
  writeFileSync(statePath, JSON.stringify({ cookies: [], origins: [] }))

  setup.skip(!account.email || !account.password, `Set ${account.envNames} in .env.e2e`)
  const health = await request
    .post(`${API_BASE_URL}/auth/login`, { data: {}, headers: { Accept: 'application/json' }, timeout: SLOW_TIMEOUT })
    .catch(() => null)
  setup.skip(!health, `Local backend (${API_BASE_URL}) is not reachable`)

  const login = page.waitForResponse((r) => r.url().includes('/auth/login') && r.request().method() === 'POST', { timeout: 90_000 })
  await page.goto('/login')
  await page.getByPlaceholder('Enter email address').fill(account.email)
  await page.getByPlaceholder('Enter password').fill(account.password)
  await page.locator('#rememberMe').check()
  await page.getByRole('button', { name: 'Sign In' }).click()

  const response = await login
  expect(response.url().startsWith(API_BASE_URL), `The app called ${response.url()}, but E2E_API_URL is ${API_BASE_URL}. Rebuild against that API.`).toBe(true)
  expect(response.status(), `Login failed: ${await response.text()}`).toBe(200)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 60_000 })
  await expect(page.locator('#navbar-nav')).toBeVisible({ timeout: SLOW_TIMEOUT })

  await page.context().storageState({ path: statePath })
}
