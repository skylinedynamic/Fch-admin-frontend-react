import { test, expect } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, HOST_USER } from '../../support/helpers'

// R2 BUG-050: emptying a partner's Address or Contact Person and saving kept
// the old value - an emptied field was left out of the update, so the API
// never heard it was cleared. On an edit, a cleared optional field is now sent
// empty.

const PARTNER = {
  id: 5, entity_id: 5, full_name: 'Wile Coyote', company_name: 'Acme Funding', email: 'wile@acme.test', phone_number: '(444) 444-4444',
  partner_type: 'White-Label Partner (WL)', is_host: 0, status: 'active', country: 'United States', subscriptions: [],
  address_line_1: '1 Desert Rd', contact_person: 'Road Runner',
}
const ADMIN_PERMS = ['view partners', 'create partners', 'update partners']

test.describe('Partner profile › clearing a field (R2 BUG-050)', () => {
  test('an emptied Address and Contact Person are sent empty, so the API clears them', async ({ page }) => {
    await seedSession(page, { permissions: ADMIN_PERMS })
    const api = await mockApi(page, [
      { method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) },
      { method: 'POST', match: /\/admin\/partners\/5$/, body: ok({ ...PARTNER, address_line_1: null, contact_person: null }) },
      { method: 'GET', match: '/common/refresh-user', body: ok({ ...HOST_USER, permissions: ADMIN_PERMS }) },
    ])
    await page.goto('/partners/5?tab=personalDetails')
    await expect(page.getByPlaceholder('Enter company name')).toHaveValue('Acme Funding')
    await expect(page.locator('input[name="address_line_1"], textarea[name="address_line_1"]').first()).toHaveValue('1 Desert Rd')
    await expect(page.locator('input[name="contact_person"]')).toHaveValue('Road Runner')

    await page.locator('input[name="address_line_1"], textarea[name="address_line_1"]').first().fill('')
    await page.locator('input[name="contact_person"]').fill('')
    await page.locator('.btn.btn-primary.w-lg', { hasText: 'Update' }).click()

    const call = await expectCall(api, 'POST', /\/admin\/partners\/5$/)
    // Present and empty - not missing (missing meant "leave as is").
    expect(call.body).toMatch(/name="address_line_1"\r\n\r\n\r\n/)
    expect(call.body).toMatch(/name="contact_person"\r\n\r\n\r\n/)
    expect(call.body).not.toContain('1 Desert Rd')
    expect(call.body).not.toContain('Road Runner')
    await expect(page.getByText('Partner updated successfully')).toBeVisible()
  })
})
