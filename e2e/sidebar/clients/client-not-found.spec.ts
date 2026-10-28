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
