import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, type ApiMock } from '../../../support/helpers'

// Funding Application details › Ownership Information (R3-BUG-044): the
// details carry each SSN masked; the eye asks the API for the full number
// (POST .../funding-application/{id}/reveal, logged there).

const DETAIL = /\/common\/request-application\/funding-application\/91$/
const REVEAL = /\/common\/request-application\/funding-application\/91\/reveal$/

const APPLICATION = {
  id: 91, partner_id: 1, borrower_id: 1,
  status: 'Submitted – Pending Review', funding_request_id: 48, funding_request_status: 'Approved', is_editable: true,
  full_name: 'QA-TEST Owner', business_name: 'QA Co', documents: [],
  ssn: '***-**-6789',
  has_co_borrower: true,
  co_borrowers: [{ id: 7, first_name: 'Cora', last_name: 'Co', ssn: '***-**-4321', date_of_birth: '1985-05-05' }],
}

async function openOwnership(page: Page): Promise<ApiMock> {
  await seedSession(page, { id: 1, is_host: 1, partner_id: 1, permissions: ['view funding application'] })
  const api = await mockApi(page, [{ method: 'GET', match: DETAIL, body: ok(APPLICATION) }])
  await page.goto('/intake-review/funding-application/91')
  await page.getByText('Ownership Information').first().click()
  return api
}

test.describe('Funding application details › SSN', () => {
  test('shows each SSN masked and reveals one in full from the API on the eye', async ({ page }) => {
    const api = await openOwnership(page)
    api.add({ method: 'POST', match: REVEAL, body: ok({ field: 'ssn', value: '123456789' }) })

    await expect(page.getByText('***-**-6789').first()).toBeVisible()
    await expect(page.getByText('***-**-4321').first()).toBeVisible()
    await page.getByRole('button', { name: 'Show SSN' }).filter({ visible: true }).first().click()

    await expect(page.getByText('123-45-6789').first()).toBeVisible()
    const calls = api.find('POST', REVEAL)
    expect(calls).toHaveLength(1)
    expect(calls[0].json).toEqual({ field: 'ssn' })
  })
})
