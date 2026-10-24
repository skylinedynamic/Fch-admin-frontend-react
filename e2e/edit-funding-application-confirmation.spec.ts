import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, type SessionUser } from './support/helpers'

// SCRUM-286: the host and a white-label partner reach the same edit form, and it
// asks the same way for both - "Edit Submitted Application?" as soon as an
// application the borrower has signed is opened, and not at all while it is
// still being filled in. The server's edit_needs_confirmation flag decides it,
// never the role. Every backend call is mocked.

const HOST: SessionUser = { id: 1, is_host: 1, partner_id: 1, partner_type: null }
const WHITE_LABEL: SessionUser = { id: 2, is_host: 0, user_type: 'Partner', partner_id: 2, partner_type: 'White-Label Partner (WL)' }

const BUSINESS = {
  id: 80,
  full_name: 'Michael Chen',
  business_name: 'Alpha Tech Solutions',
  business_email: 'michael@example.test',
  business_phone_no: '5125550100',
  business_country: 'United States',
  business_address: '9 Main St',
  business_city: 'Austin',
  business_state: 'Texas',
  business_postal_code: '78701',
  industry_type: 'Retail',
  entity_type: 'LLC',
  years_in_business: '5',
}

// Signed and submitted: an edit will cost the borrower's signature.
const SIGNED = {
  id: 80,
  funding_request_id: 29,
  status: 'Pending',
  is_editable: true,
  is_locked: false,
  requires_resign: false,
  edit_requires_resign: true,
  edit_needs_confirmation: true,
  is_business_info_saved: true,
}

// Still being filled in (On Hold): nothing signed, nothing to warn about.
const UNSIGNED = { ...SIGNED, status: 'On Hold', edit_requires_resign: false, edit_needs_confirmation: false }

async function openEditForm(page: Page, user: SessionUser, application: typeof SIGNED) {
  await seedSession(page, user)
  const api = await mockApi(page, [
    { match: '/common/funding-sequencings/grouped', body: ok({ groups: [] }) },
    { method: 'GET', match: '/common/funding-application/business-info', body: ok(BUSINESS) },
    { method: 'POST', match: '/common/funding-application/business-info', body: ok(BUSINESS, 'Business information saved successfully!') },
    { method: 'GET', match: '/common/funding-application/funding-request', body: ok(application) },
  ])
  await page.goto('/fund-application/29')
  await expect(page.getByText(/Step 1 of \d+: Business Information/).filter({ visible: true }).first()).toBeVisible()
  return api
}

const dialog = (page: Page) => page.getByRole('heading', { name: 'Edit Submitted Application?' })

for (const [who, user] of [['the host', HOST], ['a white-label partner', WHITE_LABEL]] as const) {
  test.describe(`Edit Funding Application › confirmation for ${who}`, () => {
    test('asks before editing an application the borrower has signed', async ({ page }) => {
      await openEditForm(page, user, SIGNED)

      await expect(dialog(page)).toBeVisible()
      await expect(page.getByText('Re-signature required')).toBeVisible()
    })

    test('lets the edit be saved once the warning is accepted', async ({ page }) => {
      const api = await openEditForm(page, user, SIGNED)

      await page.getByRole('button', { name: /yes, edit application/i }).click()
      await expect(dialog(page)).toBeHidden()
      await page.getByRole('button', { name: /save & next/i }).filter({ visible: true }).first().click()

      await expect.poll(() => api.find('POST', '/common/funding-application/business-info').length).toBe(1)
    })

    test('does not ask while nothing has been signed', async ({ page }) => {
      await openEditForm(page, user, UNSIGNED)

      await expect(dialog(page)).toBeHidden()
    })
  })
}
