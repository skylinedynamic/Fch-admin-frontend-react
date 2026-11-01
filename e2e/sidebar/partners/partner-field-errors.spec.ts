import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

/**
 * Partner information: the API's field errors show under their fields. The
 * Secondary Contact phone and the Tax ID used to drop theirs silently, so
 * Update did nothing visible.
 */

const PARTNER = {
  id: 5, entity_id: 5, full_name: 'Wile Coyote', company_name: 'Acme Funding', email: 'wile@acme.test', phone_number: '(444) 444-4444',
  partner_type: 'White-Label Partner (WL)', is_host: 0, status: 'active', country: 'United States', subscriptions: [],
  tax_id: '', contact_person: 'Sam Second', contact_person_phone_number: '',
}
const UPDATE = /\/admin\/partners\/5$/
// The API's answer, as it came back: one string per field.
const PHONE_ERROR = 'Enter a valid 10-digit US phone number, e.g. (555) 234-5678.'
const EIN_ERROR = 'Enter a 9-digit EIN as XX-XXXXXXX, e.g. 12-3456789.'

async function openAndSave(page: Page): Promise<ApiMock> {
  await seedSession(page, { permissions: ['view partners', 'update partners'] })
  const api = await mockApi(page, [
    { method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) },
    { method: 'POST', match: UPDATE, status: 422, body: failure(PHONE_ERROR, { contact_person_phone_number: PHONE_ERROR, tax_id: EIN_ERROR }) },
  ])
  await page.goto('/partners/5?tab=personalDetails')
  await expect(page.getByPlaceholder('Enter company name')).toHaveValue('Acme Funding')
  await page.locator('.btn.btn-primary.w-lg', { hasText: 'Update' }).click()
  await expectCall(api, 'POST', UPDATE)
  return api
}

test.describe('Partner information - field errors from the API', () => {
  test('shows the Tax ID and Secondary Contact phone errors under their fields', async ({ page }) => {
    await openAndSave(page)

    await expect(page.locator('input[name="contact_person_phone_number"]')).toHaveClass(/is-invalid/)
    await expect(page.locator('input[name="tax_id"]')).toHaveClass(/is-invalid/)
    await expect(page.getByText(PHONE_ERROR, { exact: true })).toBeVisible()
    await expect(page.getByText(EIN_ERROR, { exact: true })).toBeVisible()
  })

  test('a field\'s error clears once it is edited, the other keeps its own', async ({ page }) => {
    await openAndSave(page)
    const taxId = page.locator('input[name="tax_id"]')
    await expect(taxId).toHaveClass(/is-invalid/)

    await taxId.fill('123456789')

    await expect(taxId).not.toHaveClass(/is-invalid/)
    await expect(page.getByText(EIN_ERROR, { exact: true })).toHaveCount(0)
    await expect(page.locator('input[name="contact_person_phone_number"]')).toHaveClass(/is-invalid/)
  })
})
