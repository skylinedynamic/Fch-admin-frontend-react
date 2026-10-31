import { test, expect } from '@playwright/test'
import { mockApi, failure, seedSession } from '../../support/helpers'

// BUG-030: another partner's client id answers 404 - the page says the client
// was not found instead of showing an empty profile.
test('a client that is not yours shows Client Not Found', async ({ page }) => {
  await seedSession(page, { permissions: ['view clients', 'update clients'] })
  await mockApi(page, [{ method: 'GET', match: '/common/borrowers/136', status: 404, body: failure('Client not found.') }])
  await page.goto('/clients/136')

  await expect(page.getByText('Client Not Found')).toBeVisible()
  await expect(page.getByLabel('Social Security Number')).toHaveCount(0)
})

// BUG-001 (QA round 2): an id that is not a client - the counters answered 500
// and the Activity panel listed unrelated activity. Neither is loaded now
// unless the client itself loads.
for (const id of ['abc', '999999999']) {
  test(`/clients/${id} shows Client Not Found and loads no counters or activity`, async ({ page }) => {
    await seedSession(page, { permissions: ['view clients', 'update clients'] })
    const api = await mockApi(page, [{ method: 'GET', match: `/common/borrowers/${id}`, status: 404, body: failure('Client not found.') }])
    await page.goto(`/clients/${id}`)

    await expect(page.getByText('Client Not Found')).toBeVisible()
    expect(api.find('POST', '/borrowers-profile-states-details-count')).toHaveLength(0)
    expect(api.find('POST', '/activity-logs/fetch-all-activities')).toHaveLength(0)
  })
}
