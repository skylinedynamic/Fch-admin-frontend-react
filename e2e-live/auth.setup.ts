import { test as setup, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { LIVE } from './env'
import { PERSONAS, authFile, credentialsFor, isConfigured } from './personas'

/**
 * Signs each configured persona in once through the real login page and
 * saves its browser state (persisted auth store + session cookie) for the
 * live specs. A persona without credentials gets an empty state, so the specs
 * that need it start and skip themselves with a readable reason.
 */
for (const persona of PERSONAS) {
  setup(`sign in as ${persona.label}`, async ({ page }) => {
    const file = authFile(persona.key)
    mkdirSync(dirname(file), { recursive: true })

    if (!isConfigured(persona)) {
      writeFileSync(file, JSON.stringify({ cookies: [], origins: [] }))
      setup.skip(true, `${persona.label} not configured: set E2E_${persona.env}_EMAIL and E2E_${persona.env}_PASSWORD (see .env.e2e.example).`)
      return
    }

    // The dev API serves one request at a time; a login can queue behind other calls.
    setup.setTimeout(120_000)
    const { email, password } = credentialsFor(persona)
    const loginResponse = page.waitForResponse(
      (r) => r.url().includes('/auth/login') && r.request().method() === 'POST',
      { timeout: 90_000 }
    )

    await page.goto('/login')
    await page.getByPlaceholder('Enter email address').fill(email)
    await page.getByPlaceholder('Enter password').fill(password)
    await page.locator('#rememberMe').check()
    await page.getByRole('button', { name: 'Sign In' }).click()

    const response = await loginResponse
    expect(
      response.url().startsWith(LIVE.apiUrl),
      `The app called ${response.url()} but E2E_API_URL is ${LIVE.apiUrl}. Rebuild the app against that API or fix E2E_API_URL.`
    ).toBe(true)
    expect(response.status(), `Login failed for ${persona.label}: ${await response.text()}`).toBe(200)

    await expect(page).not.toHaveURL(/\/login/, { timeout: 60_000 })
    await page.context().storageState({ path: file })
  })
}
