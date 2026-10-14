import { test, expect, openFromSidebar, pageHeading } from '../../support/live/fixtures'

test.describe('Sidebar › Payment Method (live)', () => {
  test.beforeEach(async ({ page }) => {
    await openFromSidebar(page, 'Payment Method', /\/payment-methods$/)
  })

  test('lists the payment gateways with an on/off switch each', async ({ page }) => {
    await expect(pageHeading(page, 'Payment Method')).toBeVisible()
    await expect(page.getByText('Payment Gateways').first()).toBeVisible()
    await expect(page.locator('.page-content input[type="checkbox"]').first()).toBeVisible()
  })

  // Read-only: the confirmation is opened and cancelled, so no gateway changes.
  test('toggling a gateway asks for confirmation and Cancel changes nothing', async ({ page }) => {
    const toggle = page.locator('.page-content input[type="checkbox"]').first()
    const before = await toggle.isChecked()
    await toggle.click({ force: true })
    const dialog = page.locator('.modal.show')
    await expect(dialog.getByText('Confirm Status Change')).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toBeHidden()
    await expect(toggle).toBeChecked({ checked: before })
  })
})
