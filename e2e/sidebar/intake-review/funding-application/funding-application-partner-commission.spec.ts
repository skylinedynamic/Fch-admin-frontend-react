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
    // Set by the tier: it can't be changed here, and looks read-only.
    for (const label of ['Partner Commission Rate', 'Admin Commission Rate']) {
      const input = modal.getByLabel(label)
      await expect(input).toBeDisabled()
      await expect(input).toHaveAttribute('readonly', '')
      // The ordinary cursor, no caret: a click passes through it.
      await expect(input).toHaveCSS('cursor', 'default')
      await expect(input).toHaveCSS('pointer-events', 'none')
      await expect(input).toHaveCSS('caret-color', 'rgba(0, 0, 0, 0)')
      expect(await input.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgb(255, 255, 255)')
      await input.click({ force: true })
      await expect(input).not.toBeFocused()
      await expect(input).toHaveValue(label.startsWith('Partner') ? '20' : '80')
    }
  })

  test("a flat-amount tier opens the split at that amount's share of the success fee", async ({ page }) => {
    const modal = await openClosing(page, {
      tiers: [{ id: 1, min_count: 0, max_count: null, commission_type: 'flat', percentage: null, amount: 500 }],
      deal_position: 1,
      funded_deal_count: 0,
    }, null)

    const panel = modal.getByRole('region', { name: 'Partner Commission' })
    await expect(panel.getByTestId('partner-commission-rate')).toHaveText('$500flat per deal')

    // $250,000 x 12% = a $30,000 success fee: exactly $500 to the partner, shown
    // in $ only - no % split, nothing to type.
    await modal.getByLabel(/funded amount/i).fill('250000')
    await modal.getByLabel('Success Fee (%)').fill('12')
    await expect(modal.getByLabel('Partner Commission Rate')).toHaveCount(0)
    await expect(modal.getByLabel('Admin Commission Rate')).toHaveCount(0)
    await expect(modal.locator('[data-row]', { hasText: 'Partner Commission' })).toContainText('$500.00')
    await expect(modal.locator('[data-row]', { hasText: 'Admin Commission' })).toContainText('$29,500.00')
    await expect(modal.getByText(/of success fee/)).toHaveCount(0)
  })

  test('says when the partner has no commission set', async ({ page }) => {
    const modal = await openClosing(page, { tiers: [], deal_position: 1, funded_deal_count: 0 }, null)

    const panel = modal.getByRole('region', { name: 'Partner Commission' })
    await expect(panel.getByText('Not set', { exact: true })).toBeVisible()
    await expect(panel.getByTestId('partner-commission-deal')).toHaveText(
      'No commission is set for this partner, so the admin keeps the whole success fee.'
    )

    // Read-only: Admin 100% / Partner 0%, nothing to type.
    await modal.getByLabel('Success Fee (%)').fill('10')
    await expect(modal.getByLabel('Admin Commission Rate')).toHaveValue('100')
    await expect(modal.getByLabel('Partner Commission Rate')).toHaveValue('0')
    await expect(modal.getByLabel('Admin Commission Rate')).toBeDisabled()
    await expect(modal.getByLabel('Partner Commission Rate')).toBeDisabled()
  })
})

test.describe('Funding application › Closed (Completed) summary', () => {
  test('a flat partner commission is shown in $, with no % of the success fee', async ({ page }) => {
    await seedSession(page, {
      id: 1, is_host: 1, partner_id: 1,
      permissions: ['view funding application', 'update funding application', 'view commission', 'update commission'],
    })
    await mockApi(page, [{
      method: 'GET',
      match: DETAIL,
      body: ok({
        ...APPLICATION,
        status: 'Closed (Completed)',
        is_editable: false,
        total_funded_amount: '250000.00',
        funded_date: '2026-11-16',
        total_commission: '10.00',
        admin_commission: '94.00',
        partner_commission: '6.00',
        partner_commission_type: 'flat',
        total_commission_amount: '25000.00',
        admin_commission_amount: '23500.00',
        partner_commission_amount: '1500.00',
      }),
    }])
    await page.goto('/intake-review/funding-application/91')

    const summary = page.getByTestId('closed-summary')
    await expect(summary).toContainText('Funding Completed')
    await expect(summary.locator('[data-row]', { hasText: 'Partner Commission' })).toContainText('Flat amount')
    await expect(summary.locator('[data-row]', { hasText: 'Partner Commission' })).toContainText('$1,500.00')
    await expect(summary.locator('[data-row]', { hasText: 'Admin Commission' })).toContainText('$23,500.00')
    await expect(summary.getByText(/of success fee/)).toHaveCount(0)
  })
})

test.describe('Funding application › Closed (Completed) › saving', () => {
  test('Confirm & Update stays a green button reading Processing... while it saves', async ({ page }) => {
    const modal = await openClosing(page, { tiers: [], deal_position: 1, funded_deal_count: 0 }, null)
    // Hold the status update open, so the modal stays in its saving state.
    let release: () => void = () => {}
    await page.route(/\/status-update$/, async (route) => {
      await new Promise<void>((resolve) => { release = resolve })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ok({ ...APPLICATION })) })
    })

    await modal.getByLabel(/funded amount/i).fill('250000')
    await modal.getByRole('button', { name: 'Confirm & Update' }).click()

    const processing = modal.getByRole('button', { name: /processing/i })
    await expect(processing).toBeVisible()
    await expect(processing).toBeDisabled()
    // Still the green button, not bare text on a transparent one.
    const background = await processing.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(background).not.toBe('rgba(0, 0, 0, 0)')
    expect(background).not.toBe('transparent')
    expect(await processing.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)')
    // Only the modal shows it: the Application Status card's button stays as it is.
    await expect(page.getByRole('button', { name: /updating/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Update Status', exact: true }).locator('.spinner-border')).toHaveCount(0)
    release()
  })
})

test.describe('Funding application › Activity', () => {
  test("a status update's note shows on its own line", async ({ page }) => {
    await seedSession(page, {
      id: 1, is_host: 1, partner_id: 1,
      permissions: ['view funding application', 'update funding application', 'view commission', 'update commission'],
    })
    await mockApi(page, [
      { method: 'GET', match: DETAIL, body: ok({ ...APPLICATION }) },
      {
        method: 'POST',
        match: '/activity-logs/fetch-all-activities',
        body: ok([{
          id: 1, event_label: 'Status updated', created_at: '2026-11-16T10:00:00Z', attachments: [], field_changes: null, signatures: null,
          description: 'Michael Chen changed the status to Closed (Completed).\nNote: funded in full',
        }]),
      },
    ])
    await page.goto('/intake-review/funding-application/91')

    await page.getByText('Status updated').click()
    const description = page.getByText(/changed the status to Closed/)
    await expect(description).toBeVisible()
    expect(await description.innerHTML()).toBe('Michael Chen changed the status to Closed (Completed).<br>Note: funded in full')
  })
})
