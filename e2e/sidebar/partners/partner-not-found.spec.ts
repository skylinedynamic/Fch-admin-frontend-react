import { test, expect } from '@playwright/test'
import { mockApi, failure, seedSession } from '../../support/helpers'

// BUG-001 (QA round 2), as on the client profile: an id that is not a partner
// says so, and neither the counters nor the Activity panel are asked for it.
for (const id of ['abc', '999999999']) {
  test(`/partners/${id} shows Partner Not Found and loads no counters or activity`, async ({ page }) => {
    await seedSession(page, { permissions: ['view partners', 'update partners'] })
    const api = await mockApi(page, [{ method: 'GET', match: `/admin/partners-details/${id}`, status: 404, body: failure('Partner not found.') }])
    await page.goto(`/partners/${id}`)

    await expect(page.getByText('Partner Not Found')).toBeVisible()
    await expect(page.getByText('Failed to load partner data')).toHaveCount(0)
    expect(api.find('POST', '/partners-profile-states-details-count')).toHaveLength(0)
    expect(api.find('POST', '/activity-logs/fetch-all-activities')).toHaveLength(0)
  })
}
