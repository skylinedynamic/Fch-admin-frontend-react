import { test, expect } from '@playwright/test'
import { mockApi, ok, expectCall } from '../support/helpers'

/**
 * Calendly v2: Calendly sends people back to their partner's own portal at
 * /calendly/callback - never the API's address. The page needs no sign-in (a
 * client has no partner-portal login) and hands Calendly's answer to the API.
 */
test.describe('Calendly callback page (partner portal)', () => {
  test("hands Calendly's answer to the API and goes where it says, without a sign-in", async ({ page }) => {
    const api = await mockApi(page, [
      { method: 'POST', match: '/calendly/callback', body: ok({ url: '/login?calendly=connected' }) },
    ])

    await page.goto('/calendly/callback?code=AUTH-CODE&state=S1')

    const call = await expectCall(api, 'POST', '/calendly/callback')
    expect(call.json).toEqual({ code: 'AUTH-CODE', state: 'S1' })
    await expect(page).toHaveURL(/calendly=connected/)
  })
})
