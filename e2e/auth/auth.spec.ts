import { test, expect } from '@playwright/test'
import { mockApi, ok, failure, expectCall, seedSession } from '../support/helpers'

test.describe('Sign in', () => {
  test('shows the form with empty fields and a forgot-password link', async ({ page }) => {
    await mockApi(page)
    await page.goto('/login')
    await expect(page.getByPlaceholder('Enter email address')).toHaveValue('')
    await expect(page.getByPlaceholder('Enter password')).toHaveValue('')
    await expect(page.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/forgot-password')
  })

  // BUG-118: the footer names the brand, and never reads "(c) 2026 . All rights reserved."
  test('the footer names the company the portal is branded as', async ({ page }) => {
    await mockApi(page, [{ method: 'GET', match: '/common/branding', body: { success: true, data: { branding: { site_name: 'Four Corner Funding' }, css_vars: null } } }])
    await page.goto('/login')
    await expect(page.locator('footer')).toHaveText(`© ${new Date().getFullYear()} Four Corner Funding. All rights reserved.`)
  })

  test('the footer leaves no gap when the branding fails to load', async ({ page }) => {
    await mockApi(page, [{ method: 'GET', match: '/common/branding', status: 500, body: { message: 'Server Error' } }])
    await page.goto('/login')
    await expect(page.locator('footer')).toHaveText(`© ${new Date().getFullYear()}. All rights reserved.`)
  })

  test('toggles password visibility', async ({ page }) => {
    await mockApi(page)
    await page.goto('/login')
    const pwd = page.getByPlaceholder('Enter password')
    const toggle = page.getByRole('button', { name: /toggle password visibility/i })
    await expect(pwd).toHaveAttribute('type', 'password')
    await toggle.click()
    await expect(pwd).toHaveAttribute('type', 'text')
    await toggle.click()
    await expect(pwd).toHaveAttribute('type', 'password')
  })

  test('submitting empty credentials shows the server field errors and stays on login', async ({ page }) => {
    const api = await mockApi(page, [{
      method: 'POST', match: '/auth/login', status: 422,
      body: failure('The given data was invalid.', { email: ['The email field is required.'], password: ['The password field is required.'] }),
    }])
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expectCall(api, 'POST', '/auth/login')
    await expect(page.getByText('The email field is required.')).toBeVisible()
    await expect(page.getByText('The password field is required.')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('wrong credentials show the server message and stay on login', async ({ page }) => {
    await mockApi(page, [{
      method: 'POST', match: '/auth/login', status: 401,
      body: failure('Invalid credentials.'),
    }])
    await page.goto('/login')
    await page.getByPlaceholder('Enter email address').fill('host@example.test')
    await page.getByPlaceholder('Enter password').fill('wrong-password')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByText('Invalid credentials.').first()).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('an expired subscription is surfaced as an alert', async ({ page }) => {
    await mockApi(page, [{
      method: 'POST', match: '/auth/login', status: 403,
      body: failure('Subscription expired', { email: ['Your subscription expired.'] }),
    }])
    await page.goto('/login')
    await page.getByPlaceholder('Enter email address').fill('host@example.test')
    await page.getByPlaceholder('Enter password').fill('Password1')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.locator('.alert-danger')).toContainText(/subscription has expired/i)
  })

  test('successful login posts credentials and leaves the login page', async ({ page }) => {
    const api = await mockApi(page, [{
      method: 'POST', match: '/auth/login',
      body: ok({
        token: 'tok-123',
        user: { id: 1, name: 'Host Admin', email: 'host@example.test', is_host: 1, user_type: 'Admin', permissions: [] },
      }),
    }])
    await page.goto('/login')
    await page.getByPlaceholder('Enter email address').fill('host@example.test')
    await page.getByPlaceholder('Enter password').fill('Password1')
    // KNOWN BUG: the visible "Remember me" <label> targets htmlFor="auth-remember-check" but the
    // input id is "rememberMe", so clicking the label text does not toggle it - drive the input.
    await page.locator('#rememberMe').check()
    await page.getByRole('button', { name: 'Sign In' }).click()

    const call = await expectCall(api, 'POST', '/auth/login')
    expect(call.json).toMatchObject({ email: 'host@example.test', password: 'Password1', remember: true })
    await expect(page).not.toHaveURL(/\/login/)
  })
})

test.describe('Forgot password', () => {
  test('sends the reset link request and shows the confirmation', async ({ page }) => {
    const api = await mockApi(page, [{
      method: 'POST', match: '/auth/forgot', body: ok(null, 'Reset link sent to your email.'),
    }])
    await page.goto('/forgot-password')
    await page.getByPlaceholder('Enter Email').fill('host@example.test')
    await page.getByRole('button', { name: 'Send Reset Link' }).click()
    const call = await expectCall(api, 'POST', '/auth/forgot')
    expect(call.json).toMatchObject({ email: 'host@example.test' })
    await expect(page.getByText('Reset link sent to your email.')).toBeVisible()
  })

  test('shows the server validation error for an unknown email', async ({ page }) => {
    await mockApi(page, [{
      method: 'POST', match: '/auth/forgot', status: 422,
      body: failure('Invalid', { email: ['We cannot find a user with that email address.'] }),
    }])
    await page.goto('/forgot-password')
    await page.getByPlaceholder('Enter Email').fill('nobody@example.test')
    await page.getByRole('button', { name: 'Send Reset Link' }).click()
    await expect(page.getByText('We cannot find a user with that email address.')).toBeVisible()
  })
})

test.describe('Reset password', () => {
  test('a link without token/email is rejected client-side', async ({ page }) => {
    const api = await mockApi(page)
    await page.goto('/reset-password')
    await page.getByPlaceholder('Enter password').fill('Password1')
    await page.getByPlaceholder('Confirm password').fill('Password1')
    await page.getByRole('button', { name: 'Reset Password' }).click()
    await expect(page.getByRole('alert')).toContainText(/invalid or expired/i)
    expect(api.find('POST', '/auth/reset')).toHaveLength(0)
  })

  test('password rules update live as the user types', async ({ page }) => {
    await mockApi(page)
    await page.goto('/reset-password?token=abc&email=host@example.test')
    const rules = page.locator('#password-contain')
    await expect(rules.locator('p.valid')).toHaveCount(0)
    await page.getByPlaceholder('Enter password').fill('Password1')
    await expect(rules.locator('p.valid')).toHaveCount(4)
    await page.getByPlaceholder('Enter password').fill('password')
    await expect(rules.locator('p.valid')).toHaveCount(2) // length + lowercase
  })

  test('mismatched confirmation shows the server field error', async ({ page }) => {
    await mockApi(page, [{
      method: 'POST', match: '/auth/reset', status: 422,
      body: failure('Invalid', { password_confirmation: ['The password confirmation does not match.'] }),
    }])
    await page.goto('/reset-password?token=abc&email=host@example.test')
    await page.getByPlaceholder('Enter password').fill('Password1')
    await page.getByPlaceholder('Confirm password').fill('Different1')
    await page.getByRole('button', { name: 'Reset Password' }).click()
    await expect(page.getByText('The password confirmation does not match.')).toBeVisible()
  })

  test('success posts token + email and redirects to login', async ({ page }) => {
    const api = await mockApi(page, [{
      method: 'POST', match: '/auth/reset', body: ok(null, 'Password reset.'),
    }])
    await page.goto('/reset-password?token=abc&email=host@example.test')
    await page.getByPlaceholder('Enter password').fill('Password1')
    await page.getByPlaceholder('Confirm password').fill('Password1')
    await page.getByRole('button', { name: 'Reset Password' }).click()
    const call = await expectCall(api, 'POST', '/auth/reset')
    expect(call.json).toMatchObject({ token: 'abc', email: 'host@example.test', password: 'Password1', password_confirmation: 'Password1' })
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Route protection', () => {
  test('an unauthenticated visit to a protected page redirects to login', async ({ page }) => {
    await mockApi(page)
    await page.goto('/clients')
    await expect(page).toHaveURL(/\/login/)
  })

  test('a signed-in user without the permission is sent to access-denied', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/users')
    await expect(page).toHaveURL(/access-denied/)
  })

  test('an unknown route renders the 404 page', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByText(/404|not found/i).first()).toBeVisible()
  })
})
