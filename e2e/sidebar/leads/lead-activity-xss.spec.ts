import { test, expect } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../support/helpers'

// BUG-004 (QA round 2): a lead named `R2-XSS <img src=x onerror=...>` ran the
// onerror in the Activity panel ("Lead profile created for ..."), which
// renders descriptions as HTML. The name shows; nothing runs.
const NAME = 'R2-XSS <img src=x onerror="window.__xss = 1">'
const LEAD = { id: 192, contact_person: 'Xavier Test', company_name: NAME, email: 'xss@example.test', lead_type: 'Borrower', status: 'New', country: 'United States' }
const CREATED = {
  id: 1, log_type: 'Lead Created', log_type_raw: 'lead_created', event_label: 'Lead Created', subject: 'Lead Created',
  description: `Lead profile created for ${NAME}`, created_at: '2026-10-21 10:00:00', attachments: [], field_changes: null, signatures: null,
}

test('a lead name with HTML in it does not run in the Activity panel', async ({ page }) => {
  await seedSession(page, { permissions: ['view leads', 'update leads'] })
  await mockApi(page, [
    { method: 'GET', match: /\/common\/leads\/192$/, body: ok(LEAD) },
    { method: 'POST', match: '/activity-logs/fetch-all-activities', body: ok([CREATED]) },
  ])
  await page.goto('/leads/192')

  await expect(page.getByText(/Lead profile created for R2-XSS/)).toBeAttached()
  await expect(page.locator('.profile-timeline [onerror]')).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
})
