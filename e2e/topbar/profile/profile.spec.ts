import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('My profile', () => {
  const USER = { name: 'Host Admin', email: 'host@example.test', phone_number: '5551234567' }
  const PROFILE = '/common/auth-profile/update-profile'
  const PASSWORD = '/common/auth-profile/update-password'

  async function open(page: Page): Promise<ApiMock> {
    await seedSession(page, USER)
    const api = await mockApi(page)
    await page.goto('/profile')
    await expect(page.getByPlaceholder('Enter your first name')).toHaveValue('Host')
    return api
  }
  const saveProfile = (page: Page) => page.locator('button[form="profile-form"]')
  const savePassword = (page: Page) => page.locator('button[form="password-form"]')
  const openPasswordTab = (page: Page) => page.locator('.nav-link, button, a').filter({ has: page.locator('.ri-lock-password-line') }).first().click()

  test('prefills the form from the signed-in user, splitting the name', async ({ page }) => {
    await open(page)
    await expect(page.getByPlaceholder('Enter your last name')).toHaveValue('Admin')
    await expect(page.getByPlaceholder('Enter your email')).toHaveValue('host@example.test')
    await expect(page.getByPlaceholder('Enter your phone number')).toHaveValue('(555) 123-4567')
  })

  test('first and last name are required', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Enter your first name').fill('')
    await page.getByPlaceholder('Enter your last name').fill('')
    await saveProfile(page).click()
    await expect(page.getByText('First name is required')).toBeVisible()
    await expect(page.getByText('Last name is required')).toBeVisible()
    expect(api.find('POST', PROFILE)).toHaveLength(0)
  })

  test('saving posts the profile without the image field', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: PROFILE, body: ok(null, 'Profile updated successfully!') })
    await page.getByPlaceholder('Enter your first name').fill('Hosta')
    await saveProfile(page).click()
    const call = await expectCall(api, 'POST', PROFILE)
    expect(call.json).toMatchObject({ first_name: 'Hosta', last_name: 'Admin', email: 'host@example.test' })
    expect(call.json).not.toHaveProperty('image')
    await expect(page.getByText('Profile updated successfully!')).toBeVisible()
  })

  test('server validation errors are shown under the fields', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: PROFILE, status: 422, body: failure('Invalid', { phone_number: 'The phone number is not valid.' }) })
    await saveProfile(page).click()
    await expect(page.getByText('The phone number is not valid.')).toBeVisible()
  })

  test('a status:false response is reported', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: PROFILE, body: failure('Profile is locked.') })
    await saveProfile(page).click()
    await expect(page.getByText('Profile is locked.').first()).toBeVisible()
  })

  test.describe('Change password', () => {
    async function openPassword(page: Page) {
      const api = await open(page)
      await openPasswordTab(page)
      await expect(page.getByPlaceholder('Enter current password')).toBeVisible()
      return api
    }

    test('all three fields are required', async ({ page }) => {
      const api = await openPassword(page)
      await savePassword(page).click()
      await expect(page.getByText('Current password is required')).toBeVisible()
      await expect(page.getByText('New password is required')).toBeVisible()
      await expect(page.getByText('Please confirm your new password')).toBeVisible()
      expect(api.find('POST', PASSWORD)).toHaveLength(0)
    })

    test('a new password shorter than 8 characters is rejected', async ({ page }) => {
      await openPassword(page)
      await page.getByPlaceholder('Enter current password').fill('OldPassw0rd')
      await page.getByPlaceholder('Enter new password').fill('short1')
      await page.getByPlaceholder('Confirm new password').fill('short1')
      await savePassword(page).click()
      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
    })

    test('the confirmation must match', async ({ page }) => {
      const api = await openPassword(page)
      await page.getByPlaceholder('Enter current password').fill('OldPassw0rd')
      await page.getByPlaceholder('Enter new password').fill('NewPassw0rd')
      await page.getByPlaceholder('Confirm new password').fill('Different0')
      await savePassword(page).click()
      await expect(page.getByText('Passwords do not match')).toBeVisible()
      expect(api.find('POST', PASSWORD)).toHaveLength(0)
    })

    test('a valid change is posted and the form is cleared', async ({ page }) => {
      const api = await openPassword(page)
      api.add({ method: 'POST', match: PASSWORD, body: ok(null, 'Password updated successfully.') })
      await page.getByPlaceholder('Enter current password').fill('OldPassw0rd')
      await page.getByPlaceholder('Enter new password').fill('NewPassw0rd')
      await page.getByPlaceholder('Confirm new password').fill('NewPassw0rd')
      await savePassword(page).click()
      const call = await expectCall(api, 'POST', PASSWORD)
      expect(call.json).toEqual({ current_password: 'OldPassw0rd', new_password: 'NewPassw0rd', new_password_confirmation: 'NewPassw0rd' })
      await expect(page.getByText('Password updated successfully.')).toBeVisible()
      await expect(page.getByPlaceholder('Enter current password')).toHaveValue('')
    })

    test('a wrong current password is reported under the field', async ({ page }) => {
      const api = await openPassword(page)
      api.add({ method: 'POST', match: PASSWORD, status: 422, body: failure('Invalid', { current_password: 'The current password is incorrect.' }) })
      await page.getByPlaceholder('Enter current password').fill('WrongPassw0rd')
      await page.getByPlaceholder('Enter new password').fill('NewPassw0rd')
      await page.getByPlaceholder('Confirm new password').fill('NewPassw0rd')
      await savePassword(page).click()
      await expect(page.getByText('The current password is incorrect.')).toBeVisible()
    })
  })
})
