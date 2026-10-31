import { test, expect } from '@playwright/test'
import { mockApi, failure, seedSession } from '../../support/helpers'

// BUG-030: another partner's lead id answers 404 - the page says the lead was
// not found instead of an empty page and a "Failed to load" toast.
test('a lead that is not yours shows Lead Not Found', async ({ page }) => {
  await seedSession(page, { permissions: ['view leads', 'update leads'] })
  await mockApi(page, [{ method: 'GET', match: '/common/leads/175', status: 404, body: failure('Lead not found.') }])
  await page.goto('/leads/175')

  await expect(page.getByText('Lead Not Found')).toBeVisible()
  await expect(page.getByText('Failed to load lead details')).toHaveCount(0)
})

// BUG-001 (QA round 2): the Activity panel no longer asks for an id that is
// not a lead.
test('/leads/abc shows Lead Not Found and loads no activity', async ({ page }) => {
  await seedSession(page, { permissions: ['view leads', 'update leads'] })
  const api = await mockApi(page, [{ method: 'GET', match: '/common/leads/abc', status: 404, body: failure('Lead not found.') }])
  await page.goto('/leads/abc')

  await expect(page.getByText('Lead Not Found')).toBeVisible()
  expect(api.find('POST', '/activity-logs/fetch-all-activities')).toHaveLength(0)
})
