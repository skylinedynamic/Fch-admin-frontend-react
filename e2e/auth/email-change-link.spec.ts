import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, type ApiMock } from '../support/helpers'

/**
 * The links in the email-change emails open on this portal (not on the API):
 * /email-change/{confirm|cancel|undo}/{user}/{hash}?expires&signature. The page
 * reads the link from the API's JSON endpoint at the same path, passing the
 * query along, and acts on it only when the user says so. Signed in or not.
 * fch-api's EmailChangePortalLinksTest covers the API side.
 */

const QUERY = '?expires=1792567483&signature=2c7f05a77a7c7d888b293e9d88d751573327d1f4f612a71fe9ca1682e5a41d36'
const CONFIRM = '/email-change/confirm/251/49803257525d343a66c3dbb23f69dbb913db9712'

const link = (overrides: Record<string, unknown> = {}) => ok({
  action: 'confirm', state: 'ready', title: 'Confirm your new email address',
  message: 'Enter your password to start signing in with new@example.test.', tone: 'info',
  button: 'Confirm email change', needs_password: true, login_url: null, ...overrides,
})

async function open(page: Page, path: string, handlers: Parameters<typeof mockApi>[1]): Promise<ApiMock> {
  const api = await mockApi(page, handlers)
  await page.goto(path + QUERY)
  return api
}

test.describe('Email change link', () => {
  test('signed out, the confirmation link asks for the password and confirms the change', async ({ page }) => {
    const api = await open(page, CONFIRM, [
      { method: 'GET', match: CONFIRM, body: link() },
      { method: 'POST', match: CONFIRM, body: link({ state: 'changed', title: 'Email address changed', message: 'You now sign in with new@example.test.', tone: 'success', button: null, needs_password: false, login_url: 'http://localhost:4174/login' }) },
    ])

    await expect(page.getByRole('heading', { name: 'Confirm your new email address' })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`${CONFIRM}\\?expires=`))
    expect(api.find('POST', CONFIRM)).toHaveLength(0)

    await page.getByLabel('Password', { exact: true }).fill('secret-password')
    await page.getByRole('button', { name: 'Confirm email change' }).click()

    const call = await expectCall(api, 'POST', CONFIRM)
    expect(call.json).toEqual({ password: 'secret-password' })
    expect(call.path).toBe(`${CONFIRM}${QUERY}`)
    await expect(page.getByRole('heading', { name: 'Email address changed' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', 'http://localhost:4174/login')
  })

  test('the link is read with its expires and signature unchanged', async ({ page }) => {
    const api = await open(page, CONFIRM, [{ method: 'GET', match: CONFIRM, body: link() }])

    const call = await expectCall(api, 'GET', CONFIRM)
    expect(call.path).toBe(`${CONFIRM}${QUERY}`)
  })

  test('a wrong password is shown under the field and the form stays', async ({ page }) => {
    await open(page, CONFIRM, [
      { method: 'GET', match: CONFIRM, body: link() },
      { method: 'POST', match: CONFIRM, body: link({ state: 'wrong_password', message: 'That password is not correct.', tone: 'danger' }) },
    ])

    await page.getByLabel('Password', { exact: true }).fill('a-guess')
    await page.getByRole('button', { name: 'Confirm email change' }).click()

    await expect(page.getByText('That password is not correct.')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toHaveClass(/is-invalid/)
  })

  test('an expired link explains itself and offers sign-in', async ({ page }) => {
    await open(page, CONFIRM, [{
      method: 'GET', match: CONFIRM,
      body: link({ state: 'invalid', title: 'This link has expired', message: 'Ask for the email change again.', tone: 'warning', button: null, needs_password: false }),
    }])

    await expect(page.getByRole('heading', { name: 'This link has expired' })).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/login')
  })

  test('the old address cancels a pending change without a password', async ({ page }) => {
    const CANCEL = '/email-change/cancel/251/49803257525d343a66c3dbb23f69dbb913db9712'
    const api = await open(page, CANCEL, [
      { method: 'GET', match: CANCEL, body: link({ action: 'cancel', title: 'Cancel this email change?', button: 'Cancel the change', needs_password: false }) },
      { method: 'POST', match: CANCEL, body: link({ action: 'cancel', state: 'cancelled', title: 'Email change cancelled', tone: 'success', button: null, needs_password: false }) },
    ])

    await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Cancel the change' }).click()

    await expectCall(api, 'POST', CANCEL)
    await expect(page.getByRole('heading', { name: 'Email change cancelled' })).toBeVisible()
  })

  test('opens for a signed-in user too, without leaving the page', async ({ page }) => {
    await seedSession(page)
    await open(page, CONFIRM, [{ method: 'GET', match: CONFIRM, body: link() }])

    await expect(page.getByRole('heading', { name: 'Confirm your new email address' })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(CONFIRM))
  })
})
