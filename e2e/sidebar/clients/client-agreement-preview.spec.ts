import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, openProfileTab } from '../../support/helpers'

/**
 * Clients › a client › Agreement: before the client signs, the host previews
 * their partner's active borrower agreement filled with the client's details
 * (GET /common/agreement-sign/preview/:userId). The API is mocked; nothing is written.
 */
const B = '/common/borrowers'
const CLIENT = {
  id: 1, user_id: 91, first_name: 'Johnathan', last_name: 'Smithfield', business_name: 'Smithfield Bakery LLC', email: 'john@example.test',
  phone_number: '(222) 222-2222', status: 'Active', partner_id: 2, has_sign: false, agreement_required: true,
}
const REQUIREMENT = { user_id: 91, agreement_required: true, signing_enabled: true, template_active: true, can_change: true, locked_reason: null }

async function openAgreementTab(page: Page) {
  await seedSession(page, { permissions: ['view clients', 'update clients'] })
  await mockApi(page, [
    { method: 'GET', match: new RegExp(`${B}/1$`), body: ok(CLIENT) },
    { method: 'GET', match: `/common/agreement-sign/required/${CLIENT.user_id}`, body: ok(REQUIREMENT) },
    {
      method: 'GET',
      match: `/common/agreement-sign/preview/${CLIENT.user_id}`,
      body: ok({ template_id: 9, slug: 'borrower', template_html: '<html><body><p>Welcome Johnathan Smithfield of Smithfield Bakery LLC</p></body></html>' }),
    },
  ])
  await page.goto('/clients/1')
  await expect(page.locator('#first_name')).toHaveValue('Johnathan')
  await openProfileTab(page, 'Agreement')
}

test.describe('Client profile - previewing the unsigned agreement', () => {
  test("opens their partner's active borrower agreement, filled with the client's details", async ({ page }) => {
    await openAgreementTab(page)

    await page.getByRole('button', { name: 'Preview Agreement' }).click()

    const dialog = page.getByRole('dialog', { name: 'Borrower agreement preview' })
    await expect(dialog).toBeVisible()
    await expect(page.frameLocator('iframe[title="Borrower agreement preview"]').getByText('Welcome Johnathan Smithfield of Smithfield Bakery LLC')).toBeVisible()

    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toHaveCount(0)
  })
})
