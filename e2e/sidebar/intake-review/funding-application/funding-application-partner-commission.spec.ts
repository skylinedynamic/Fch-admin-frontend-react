import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, pickPrime } from '../../../support/helpers'

// Funding Application details (host) › Closed (Completed): the modal shows the
// partner's own commission tiers (Partner profile › Commissions) - or that none
// are set - and the tier this deal falls in, which the partner rate opens at.

const DETAIL = /\/common\/request-application\/funding-application\/91$/

const APPLICATION = {
  id: 91, partner_id: 5, borrower_id: 1,
  status: 'Submitted – Pending Review', status_note: '',
  funding_request_id: 48, funding_request_status: 'Approved', is_editable: true,
  full_name: 'QA-TEST Partner Client', business_name: 'QA Co', co_borrowers: [], documents: [],
  requested_amount_original: 250000, total_commission: null, admin_commission: null, partner_commission: null,
}

const TIERS = [
  { id: 1, min_count: 0, max_count: 10, percentage: 10 },
  { id: 2, min_count: 11, max_count: null, percentage: 20 },
]

async function openClosing(page: Page, setup: unknown, defaultRate: number | null) {
  await seedSession(page, {
    id: 1, is_host: 1, partner_id: 1,
    permissions: ['view funding application', 'update funding application', 'view commission', 'update commission'],
  })
  await mockApi(page, [{
    method: 'GET',
    match: DETAIL,
    body: ok({ ...APPLICATION, partner_commission_setup: setup, partner_default_commission: defaultRate }),
  }])
  await page.goto('/intake-review/funding-application/91')
  await expect(page.getByRole('button', { name: 'Update Status' })).toBeVisible()

  const picker = page.locator('.p-dropdown', { has: page.locator('.p-dropdown-label', { hasText: /Submitted/ }) }).first()
  await pickPrime(page, picker, 'Closed (Completed)')
  await page.getByRole('button', { name: 'Update Status' }).click()
  return page.locator('.modal.show')
}

test.describe('Funding application › Closed (Completed) › Partner Commission', () => {
  test("shows the partner's tiers and opens the split at this deal's tier", async ({ page }) => {
    const modal = await openClosing(page, { tiers: TIERS, deal_position: 12, funded_deal_count: 11 }, 20)

    const panel = modal.getByRole('region', { name: 'Partner Commission' })
    await expect(panel.getByTestId('partner-commission-rate')).toHaveText('20%of success fee')
    await expect(panel.getByTestId('partner-commission-deal')).toHaveText('Deal #12 · 11+ deals tier')

    await modal.getByLabel('Success Fee (%)').fill('10')
    await expect(modal.getByLabel('Partner Commission Rate')).toHaveValue('20')
    await expect(modal.getByLabel('Admin Commission Rate')).toHaveValue('80')
  })

  test('says when the partner has no commission set', async ({ page }) => {
    const modal = await openClosing(page, { tiers: [], deal_position: 1, funded_deal_count: 0 }, null)

    const panel = modal.getByRole('region', { name: 'Partner Commission' })
    await expect(panel.getByText('Not set', { exact: true })).toBeVisible()
    await expect(panel.getByTestId('partner-commission-deal')).toHaveText(
      'No commission is set for this partner. Set the Partner Commission Rate manually below.'
    )
  })
})
