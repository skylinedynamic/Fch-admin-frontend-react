import { test, expect } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall } from '../../support/helpers'

// R2 BUG-055: a lead without a country showed "United States" on Contact Info,
// yet saving answered "Country is required." - the default was only shown,
// never put in the form. It is now part of the form, so it is what gets saved.

const LEAD = {
  id: 52, contact_person: 'Milo Missing', company_name: 'Half Data LLC', email: 'milo@example.test', phone_number: '(555) 010-0002',
  lead_type: 'Borrower', status: 'New', country: '', state: '', city: '', convert_to: null,
}

const LOCATIONS = [{
  name: 'United States', code: 'USA', phone_code: '+1',
  states: [{ name: 'Texas', code: 'TX', cities: ['Austin'] }],
}]

test.describe('Lead › Contact Info › default country (R2 BUG-055)', () => {
  test('a lead without a country is saved with the country it shows', async ({ page }) => {
    await seedSession(page, { permissions: ['view leads', 'update leads'] })
    const api = await mockApi(page, [
      { method: 'GET', match: /\/common\/leads\/52$/, body: ok(LEAD) },
      { method: 'GET', match: '/common/locations', body: ok(LOCATIONS) },
      { method: 'POST', match: '/common/leads/52/contact-info', body: ok({ ...LEAD, country: 'United States' }) },
    ])
    await page.goto('/leads/52?tab=contactInfo')
    await expect(page.locator('input[name="contact_person"]')).toHaveValue('Milo Missing')
    const country = page.locator('.mb-3', { has: page.locator('label.form-label', { hasText: 'Country' }) }).locator('.p-dropdown-label')
    await expect(country).toHaveText('United States')

    await page.getByRole('button', { name: /update/i }).click()

    const call = await expectCall(api, 'POST', '/common/leads/52/contact-info')
    expect(call.json).toMatchObject({ country: 'United States' })
    await expect(page.getByText('Lead contact information updated successfully')).toBeVisible()
    await expect(page.getByText('Country is required.')).toHaveCount(0)
  })
})
