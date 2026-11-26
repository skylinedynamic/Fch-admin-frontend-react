import { test, expect } from '@playwright/test'
import { expectCall, mockApi, ok, failure, seedSession } from '../support/helpers'

// A partner, staff member or host user signed in with an issued (temporary)
// password - the welcome email's, or one an admin typed - sees only the Set
// password screen until they choose their own. fch-api marks such a login
// (must_change_password) and holds its other calls (ForcePasswordChangeTest);
// this checks the portal keeps them on the screen and lets them through after.
const FLAGGED = {
  id: 21,
  name: 'New Staff',
  email: 'new.staff@example.test',
  user_type: 'Partner',
  is_host: 0,
  partner_id: 4,
  permissions: ['view clients'],
  must_change_password: true,
}

const CHOSEN = 'Chosen#Pass2026'

async function openFlagged(page: import('@playwright/test').Page) {
  await seedSession(page, FLAGGED)
  return mockApi(page, [
    // The session reads say the same as the sign-in did.
    { method: 'GET', match: '/common/refresh-user', body: ok(FLAGGED) },
    { method: 'GET', match: '/common/user-details', body: ok({ user: FLAGGED }) },
  ])
}

test.describe('Force password change', () => {
  test('a user with an issued password is kept on the Set password screen', async ({ page }) => {
    await openFlagged(page)

    await page.goto('/clients')

    await expect(page).toHaveURL(/\/set-password$/)
    await expect(page.getByRole('heading', { name: /Set your new password/i })).toBeVisible()
    await expect(page.getByText(/^Hi New, you signed in with a temporary password\./)).toBeVisible()
    await expect(page.locator('#navbar-nav')).toHaveCount(0)

    // Laid out like Profile > Change Password: new and confirm side by side.
    const newBox = await page.locator('#new_password').boundingBox()
    const confirmBox = await page.locator('#new_password_confirmation').boundingBox()
    expect(newBox?.y).toBeCloseTo(confirmBox?.y ?? -1, 0)
    expect((confirmBox?.x ?? 0) > (newBox?.x ?? 0)).toBe(true)
    // A compact card: the whole form fits a laptop screen without scrolling.
    const cardBox = await page.locator('.card').first().boundingBox()
    expect(cardBox?.height ?? 9999).toBeLessThan(600)
    // ...and flush with the full-width field above them.
    const currentBox = await page.locator('#current_password').boundingBox()
    expect(newBox?.x).toBeCloseTo(currentBox?.x ?? -1, 0)
    expect((confirmBox?.x ?? 0) + (confirmBox?.width ?? 0)).toBeCloseTo((currentBox?.x ?? 0) + (currentBox?.width ?? 0), 0)
    for (const id of ['current_password', 'new_password', 'new_password_confirmation']) {
      const box = await page.locator(`#${id}`).boundingBox()
      expect(box?.height).toBeCloseTo(37.5, 0)
    }
    await expect(page.getByRole('button', { name: /Toggle password visibility/i })).toHaveCount(3)
    await expect(page.getByRole('button', { name: /Set Password/i })).toHaveClass(/btn-success/)
    await expect(page.getByRole('heading', { name: 'Password Requirements' })).toBeVisible()
    await expect(page.getByText('Include at least one special character')).toBeVisible()
    // The requirements card has a visible border, not one the colour of its background.
    const rulesCard = page.locator('.password-requirements')
    const { border, width, background } = await rulesCard.evaluate((el) => {
      const cs = getComputedStyle(el)
      const parentBg = getComputedStyle(el.parentElement?.closest('.card-body') ?? document.body).backgroundColor
      return { border: cs.borderTopColor, width: cs.borderTopWidth, background: parentBg }
    })
    expect(width).toBe('1px')
    expect(border).not.toBe(background)
    expect(border).not.toBe('rgb(255, 255, 255)')

    // Each rule is ticked as the new password meets it.
    const rules = page.locator('li[data-met]')
    await expect(rules).toHaveCount(4)
    await page.getByLabel(/^New Password/i).fill('abcD1')
    await expect(rules.nth(0)).toHaveAttribute('data-met', 'false')
    await expect(rules.nth(1)).toHaveAttribute('data-met', 'true')
    await expect(rules.nth(2)).toHaveAttribute('data-met', 'true')
    await expect(rules.nth(3)).toHaveAttribute('data-met', 'false')
    await page.getByLabel(/^New Password/i).fill('abcD1#xyz')
    for (let i = 0; i < 4; i++) await expect(rules.nth(i)).toHaveAttribute('data-met', 'true')
    await expect(rules.nth(0)).toHaveClass(/text-success/)
  })

  test('choosing a password opens the portal', async ({ page }) => {
    const api = await openFlagged(page)
    api.add({ method: 'POST', match: '/common/auth-profile/update-password', body: ok(null, 'Password updated') })
    await page.goto('/set-password')

    await page.getByLabel(/Temporary Password/i).fill('a1b2c3d4')
    await page.getByLabel(/^New Password/i).fill(CHOSEN)
    await page.getByLabel(/Confirm New Password/i).fill(CHOSEN)
    await page.getByRole('button', { name: /Set Password/i }).click()

    const call = await expectCall(api, 'POST', '/common/auth-profile/update-password')
    expect(call.json).toEqual({ current_password: 'a1b2c3d4', new_password: CHOSEN, new_password_confirmation: CHOSEN })
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('#navbar-nav')).toBeVisible()
  })

  test('the server reasons appear under their fields', async ({ page }) => {
    const api = await openFlagged(page)
    api.add({
      method: 'POST',
      match: '/common/auth-profile/update-password',
      status: 422,
      body: failure('Validation failed', { current_password: ['The current password is incorrect.'] }),
    })
    await page.goto('/set-password')

    await page.getByLabel(/Temporary Password/i).fill('wrong-one')
    await page.getByLabel(/^New Password/i).fill(CHOSEN)
    await page.getByLabel(/Confirm New Password/i).fill(CHOSEN)
    await page.getByRole('button', { name: /Set Password/i }).click()

    await expect(page.locator('#current_password ~ .invalid-feedback')).toHaveText('The current password is incorrect.')
    await expect(page).toHaveURL(/\/set-password$/)
  })
})
