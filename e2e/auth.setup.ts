import { test as setup, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { API_BASE_URL, AUTH_STATE_PATH, HOST_EMAIL, HOST_PASSWORD, SLOW_TIMEOUT } from './support/live/env'

// Logs the host in once through the real login form and saves the persisted
// auth store (localStorage + session cookie), so every live spec starts
// already signed in instead of paying for a Passport login per test.
setup('authenticate as host', async ({ page, request }) => {
  setup.setTimeout(120_000)
  mkdirSync(dirname(AUTH_STATE_PATH), { recursive: true })
  writeFileSync(AUTH_STATE_PATH, JSON.stringify({ cookies: [], origins: [] }))

  setup.skip(!HOST_EMAIL || !HOST_PASSWORD, 'Set E2E_HOST_EMAIL and E2E_HOST_PASSWORD in .env.e2e')
  const health = await request
    .post(`${API_BASE_URL}/auth/login`, { data: {}, headers: { Accept: 'application/json' }, timeout: SLOW_TIMEOUT })
    .catch(() => null)
  setup.skip(!health, `Local backend (${API_BASE_URL}) is not reachable`)

  const login = page.waitForResponse((r) => r.url().includes('/auth/login') && r.request().method() === 'POST', { timeout: 90_000 })
  await page.goto('/login')
  await page.getByPlaceholder('Enter email address').fill(HOST_EMAIL)
  await page.getByPlaceholder('Enter password').fill(HOST_PASSWORD)
  await page.locator('#rememberMe').check()
  await page.getByRole('button', { name: 'Sign In' }).click()

  const response = await login
  expect(response.url().startsWith(API_BASE_URL), `The app called ${response.url()}, but E2E_API_URL is ${API_BASE_URL}. Rebuild against that API.`).toBe(true)
  expect(response.status(), `Login failed: ${await response.text()}`).toBe(200)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 60_000 })
  await expect(page.locator('#navbar-nav')).toBeVisible({ timeout: SLOW_TIMEOUT })

  await page.context().storageState({ path: AUTH_STATE_PATH })
})
