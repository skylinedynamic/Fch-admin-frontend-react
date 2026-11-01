import { test, expect } from '@playwright/test'
import { mockApi, ok, seedSession, API_ORIGIN } from '../../support/helpers'

// BUG-142: a partner on a free trial could add a paid client through Add
// Client. The subscription that says the partner is on a trial loads after the
// page, and the form only turned the Limited Free Plan on if it was already
// there - so on a fresh load the switch was locked off and the paid Enrollment
// Type was open. It now turns on once the trial is known, as on Convert Lead.

const TRIAL_PARTNER = {
  id: 9, entity_type: 'Partner', partner_id: 9, is_host: 0, partner_type: 'Certified Partner',
  permissions: ['view clients', 'create clients', 'update clients'],
}

test('Add Client on a free trial turns the Limited Free Plan on and offers no paid enrollment', async ({ page }) => {
  await seedSession(page, TRIAL_PARTNER)
  await mockApi(page, [])
  // The subscription answers late, as on a fresh page load.
  await page.route(`${API_ORIGIN}/common/user-details`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.fulfill({ json: ok({ user: { ...TRIAL_PARTNER, is_free_trail: true, free_trail_end_date: '2026-11-28' } }) })
  })

  await page.goto('/clients/create')

  await expect(page.getByRole('checkbox', { name: 'Activate Limited Free Plan' })).toBeChecked({ timeout: 10_000 })
  await expect(page.getByText('Enrollment Type', { exact: false })).toHaveCount(0)
})
