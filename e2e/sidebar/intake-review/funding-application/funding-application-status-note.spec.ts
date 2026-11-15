import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, pickPrime, type ApiMock } from '../../../support/helpers'

// R3-BUG-016: the host's status note was shown word-for-word to the borrower,
// the form never said so, and the box pre-filled the last note. A note is now
// internal unless "Visible to client" is ticked, and the box starts empty.

const DETAIL = /\/common\/request-application\/funding-application\/107$/
const STATUS = '/common/request-application/funding-application/status-update'

const APPLICATION = {
  id: 107, partner_id: 1, borrower_id: 1,
  status: 'Submitted – Pending Review',
  status_note: 'QA-TEST R3 please confirm revenue', status_note_visible_to_client: true,
  funding_request_id: 47, funding_request_status: 'Approved', is_editable: true,
  full_name: 'QA-TEST ONB', business_name: 'QA-TEST ONB Wanda LLC', co_borrowers: [], documents: [],
}

async function open(page: Page): Promise<ApiMock> {
  await seedSession(page, {
    id: 1, is_host: 1, partner_id: 1,
    permissions: ['view funding application', 'update funding application'],
  })
  const api = await mockApi(page, [{ method: 'GET', match: DETAIL, body: ok(APPLICATION) }])
  await page.goto('/intake-review/funding-application/107')
  await expect(page.getByRole('button', { name: 'Update Status' })).toBeVisible()
  api.add({ method: 'POST', match: STATUS, body: ok({ ...APPLICATION, status: 'Submitted (Received)' }, 'Status updated successfully') })
  return api
}

const statusPicker = (page: Page) => page.locator('.p-dropdown', { has: page.locator('.p-dropdown-label', { hasText: /Submitted/ }) }).first()

async function update(page: Page) {
  await page.getByRole('button', { name: 'Update Status' }).click()
  await page.locator('.modal.show').getByRole('button', { name: 'Update', exact: true }).click()
}

test.describe('Funding application details › who sees the status note (R3-BUG-016)', () => {
  test('the last note is shown read-only, and the box starts empty', async ({ page }) => {
    await open(page)

    await expect(page.getByTestId('last-status-note')).toContainText('QA-TEST R3 please confirm revenue')
    await expect(page.getByTestId('last-status-note')).toContainText('Visible to client')
    await expect(page.getByLabel('Status Notes')).toHaveValue('')
    await expect(page.getByText(/only your team sees this note/i)).toBeVisible()
  })

  test('a note is sent as internal unless ticked', async ({ page }) => {
    const api = await open(page)

    await pickPrime(page, statusPicker(page), 'Submitted (Received)')
    await page.getByLabel('Status Notes').fill('QA-TEST internal: lender X declined, try Y (R3 FAPP-16)')
    await update(page)

    const call = await expectCall(api, 'POST', STATUS)
    expect(call.json).toMatchObject({
      funding_application_id: 107,
      status_note: 'QA-TEST internal: lender X declined, try Y (R3 FAPP-16)',
      status_note_visible_to_client: false,
    })
  })

  test('a ticked note is sent to the client, and the form says so', async ({ page }) => {
    const api = await open(page)

    await pickPrime(page, statusPicker(page), 'Submitted (Received)')
    await page.getByLabel('Status Notes').fill('Please upload bank statements')
    await page.getByLabel('Visible to client').check()
    await expect(page.getByText(/the client sees this note/i)).toBeVisible()
    await update(page)

    const call = await expectCall(api, 'POST', STATUS)
    expect(call.json).toMatchObject({ status_note: 'Please upload bank statements', status_note_visible_to_client: true })
  })
})
