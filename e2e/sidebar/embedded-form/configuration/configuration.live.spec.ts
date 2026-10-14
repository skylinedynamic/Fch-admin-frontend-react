import { test, expect, openFromSidebar, pageHeading } from '../../../support/live/fixtures'

test.describe('Sidebar › Embedded Form › Configuration (live)', () => {
  test.beforeEach(async ({ page }) => {
    await openFromSidebar(page, 'Configuration', /\/embed-form\/settings$/, 'Embedded Form')
  })

  test('shows the form settings and the embed code', async ({ page }) => {
    await expect(pageHeading(page, 'Form Configuration')).toBeVisible()
    await expect(page.getByPlaceholder('e.g. Personal Loan Application')).toBeVisible()
    await expect(page.getByText('Embed & Share').first()).toBeVisible()
    for (const name of ['Save Configuration', 'Copy Embed HTML', 'Regenerate Public Key']) {
      await expect(page.getByRole('button', { name }).first()).toBeVisible()
    }
  })
})
