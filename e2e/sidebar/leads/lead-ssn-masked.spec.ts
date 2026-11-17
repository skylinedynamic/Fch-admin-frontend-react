import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, type ApiMock } from '../../support/helpers'

// R3-BUG-004: the lead API sent the full SSN (and EIN) on every read, and the
// host opens every partner's leads. Leads now follow the client rule (BUG-014):
// both numbers arrive masked, the eye button fetches one in full through the
// logged POST leads/{id}/reveal, and a save leaves out a number still masked so
// the one on file stays.

const LEAD = {
  id: 53, contact_person: 'Sam Secure', company_name: 'Masked LLC', email: 'sam@example.test', phone_number: '(555) 010-0003',
  lead_type: 'Borrower', status: 'New', country: 'United States', state: '', city: '', convert_to: null,
  ssn: '***-**-6789', business_ein: '**-***4321',
}

async function openContactInfo(page: Page, user: Record<string, unknown> = {}): Promise<ApiMock> {
  await seedSession(page, { permissions: ['view leads', 'update leads'], ...user })
  const api = await mockApi(page, [
    { method: 'GET', match: /\/common\/leads\/53$/, body: ok(LEAD) },
    { method: 'POST', match: '/common/leads/53/contact-info', body: ok(LEAD) },
    { method: 'POST', match: '/common/leads/53/reveal', body: (req) => {
      const field = JSON.parse(req.postData() || '{}').field
      return ok({ field, value: field === 'ssn' ? '123456789' : '987654321' })
    } },
  ])
  await page.goto('/leads/53?tab=contactInfo')
  await expect(page.locator('input[name="contact_person"]')).toHaveValue('Sam Secure')
  return api
}

test.describe('Lead › Contact Info › masked SSN and EIN (R3-BUG-004)', () => {
  for (const [who, user] of [['the lead\'s partner', { is_host: 0, partner_id: 5 }], ['the host', { is_host: 1 }]] as const) {
    test(`${who} sees both numbers masked, and in full only through the reveal`, async ({ page }) => {
      const api = await openContactInfo(page, user)

      await expect(page.locator('#ssn')).toHaveValue('***-**-6789')
      await expect(page.locator('#business_ein')).toHaveValue('**-***4321')
      expect(api.find('POST', '/common/leads/53/reveal')).toHaveLength(0)

      await page.getByRole('button', { name: 'Show SSN' }).click()
      await expect(page.locator('#ssn')).toHaveValue('123-45-6789')
      const call = await expectCall(api, 'POST', '/common/leads/53/reveal')
      expect(call.json).toEqual({ field: 'ssn' })
    })
  }

  test('saving without revealing leaves both numbers out, so the ones on file stay', async ({ page }) => {
    const api = await openContactInfo(page)

    await page.getByRole('button', { name: /update/i }).click()

    const call = await expectCall(api, 'POST', '/common/leads/53/contact-info')
    expect(call.json).not.toHaveProperty('ssn')
    expect(call.json).not.toHaveProperty('business_ein')
    expect(JSON.stringify(call.json)).not.toContain('***')
    await expect(page.getByText('Lead contact information updated successfully')).toBeVisible()
  })
})
