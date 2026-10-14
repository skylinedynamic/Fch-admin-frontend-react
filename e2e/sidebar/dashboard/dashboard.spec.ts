import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('Dashboard', () => {
  test('greets the signed-in user by first name', async ({ page }) => {
    await seedSession(page, { first_name: 'Hosta' })
    const api = await mockApi(page, [{ method: 'GET', match: '/common/dashboard', body: ok({}) }])
    await page.goto('/')
    await expect(page.getByText('Welcome, Hosta!')).toBeVisible()
    await expectCall(api, 'GET', '/common/dashboard')
  })

  // The login API sends `name` only, no `first_name` (see dashboard.live.spec.ts).
  test('greets a user from the login response by the first word of their name', async ({ page }) => {
    await seedSession(page, { name: 'Craig Rice' })
    await mockApi(page, [{ method: 'GET', match: '/common/dashboard', body: ok({}) }])
    await page.goto('/')
    await expect(page.getByText('Welcome, Craig!')).toBeVisible()
  })

  test('falls back to a generic greeting when the name is unknown', async ({ page }) => {
    await seedSession(page, { name: '' })
    await mockApi(page, [{ method: 'GET', match: '/common/dashboard', body: ok({}) }])
    await page.goto('/')
    await expect(page.getByText('Welcome, User!')).toBeVisible()
  })

  test('a signed-out visitor is sent to the login page', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })
})
