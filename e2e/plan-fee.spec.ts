import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from './helpers'

/**
 * Plan & Fee: the host partner edits what each plan costs. billing.spec.ts
 * only checks that the page loads and who may open it; this covers the
 * editing itself.
 */

const HOST_PARTNER = { is_host: 1, entity_type: 'Partner', entity_id: 1 }
const FETCH = '/admin/plan-fee/fetch-subscription-plans'
const UPDATE = (id: number) => `/admin/plan-fee/update-subscription-plan/${id}`

const plan = (id: number, over: Record<string, unknown> = {}) => ({
  id, partner_type: 'White-Label Partner (WL)', partner_type_slug: 'wl', enrollment_type: 'Monthly', enrollment_type_slug: 'monthly',
  entity_type: 'Partner', is_partner_paying: true, total_installments_count: null, subscription_period_month: 1,
  total_amount: '499.00', platform_fee: '99.00', total_installment_count_upto: null, total_seat_count: null,
  currency: 'USD', currency_symbol: '$', status: true, ...over,
})

const PLANS = {
  partner_enrollment: [plan(11)],
  borrower_enrollment: [plan(21, { entity_type: 'Borrower', total_amount: '1200.00', platform_fee: '0.00' })],
  user_seat: [plan(31, { entity_type: 'User', total_amount: '49.00', platform_fee: '0.00', total_seat_count: 3 })],
}

async function open(page: Page, plans: unknown = PLANS): Promise<ApiMock> {
  await seedSession(page, HOST_PARTNER)
  const api = await mockApi(page, [{ method: 'POST', match: FETCH, body: ok(plans) }])
  await page.goto('/plan-and-fee')
  await expect(page.locator('input[type="number"]').first()).toBeVisible()
  return api
}

// The tab also shows a count badge, so match its label span exactly.
const tab = (page: Page, name: string) => page.locator('button.nav-link', { has: page.locator('span', { hasText: new RegExp(`^${name}$`) }) })
const amounts = (page: Page) => page.locator('input[type="number"]')
const withValue = async (page: Page, value: string) => {
  const inputs = amounts(page)
  for (let i = 0; i < (await inputs.count()); i++) {
    if ((await inputs.nth(i).inputValue()) === value) return inputs.nth(i)
  }
  throw new Error(`No amount field currently holds ${value}`)
}
const save = (page: Page) => page.locator('button', { hasText: /^\s*Save\s*$/ }).first()
const confirm = (page: Page) => page.getByRole('button', { name: 'Confirm & Save' })

test.describe('Plan & Fee - plans', () => {
  test('opens on the first group that has plans and shows its current prices', async ({ page }) => {
    await open(page)
    await expect(tab(page, 'Partner Enrollment')).toHaveClass(/active/)
    await expect(await withValue(page, '499.00')).toBeVisible()
    await expect(await withValue(page, '99.00')).toBeVisible()
  })

  test('only offers a tab for a group that has plans', async ({ page }) => {
    await open(page)
    await expect(tab(page, 'Partner Enrollment')).toHaveCount(1)
    await expect(tab(page, 'Borrower Enrollment')).toHaveCount(1)
    await expect(tab(page, 'User Seat')).toHaveCount(1)
    await expect(tab(page, 'Borrower Fee')).toHaveCount(0)
  })

  test('switching tab shows that group', async ({ page }) => {
    await open(page)
    await tab(page, 'Borrower Enrollment').click()
    await expect(await withValue(page, '1200.00')).toBeVisible()
  })

  test('the borrower enrollment group has no platform fee field', async ({ page }) => {
    await open(page)
    const partnerFields = await amounts(page).count()
    await tab(page, 'Borrower Enrollment').click()
    await expect(await withValue(page, '1200.00')).toBeVisible()
    expect(await amounts(page).count()).toBeLessThan(partnerFields)
  })

  test('the user seat group shows the number of free seats', async ({ page }) => {
    await open(page)
    await tab(page, 'User Seat').click()
    await expect(page.getByText('Free Seats including partner')).toBeVisible()
    await expect(await withValue(page, '3')).toBeVisible()
  })
})

test.describe('Plan & Fee - saving', () => {
  test('Save without a change says so and calls nothing', async ({ page }) => {
    const api = await open(page)
    await save(page).click()
    await expect(page.getByText('No changes detected for this plan.')).toBeVisible()
    expect(api.find('PUT', '/admin/plan-fee/')).toHaveLength(0)
  })

  test('a changed amount shows the before and after, then saves on confirmation', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: UPDATE(11), body: ok(null, 'Plan updated successfully') })

    await (await withValue(page, '499.00')).fill('549')
    await save(page).click()

    const dialog = page.locator('.modal.show, [role="dialog"]').filter({ hasText: 'Confirm & Save' }).first()
    await expect(dialog).toContainText('499')
    await expect(dialog).toContainText('549')
    expect(api.find('PUT', UPDATE(11))).toHaveLength(0)

    await confirm(page).click()
    const call = await expectCall(api, 'PUT', UPDATE(11))
    expect(call.json).toMatchObject({ total_amount: 549, platform_fee: 99 })
    expect(call.json).not.toHaveProperty('include_existing_subscription')
    await expect(page.getByText('Plan updated successfully')).toBeVisible()
  })

  test('saving reloads the plans', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: UPDATE(11), body: ok(null) })
    const loads = api.find('POST', FETCH).length
    await (await withValue(page, '499.00')).fill('549')
    await save(page).click()
    await confirm(page).click()
    await expect.poll(() => api.find('POST', FETCH).length).toBeGreaterThan(loads)
  })

  test('a changed platform fee asks whether existing subscriptions follow, defaulting to no', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: UPDATE(11), body: ok(null) })
    await (await withValue(page, '99.00')).fill('129')
    await save(page).click()
    await expect(page.locator('#modalIncludeExistingSub')).not.toBeChecked()
    await confirm(page).click()
    const call = await expectCall(api, 'PUT', UPDATE(11))
    expect(call.json).toMatchObject({ platform_fee: 129, include_existing_subscription: false })
  })

  test('ticking the box applies the new fee to existing subscriptions', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: UPDATE(11), body: ok(null) })
    await (await withValue(page, '99.00')).fill('129')
    await save(page).click()
    await page.locator('#modalIncludeExistingSub').check()
    await confirm(page).click()
    const call = await expectCall(api, 'PUT', UPDATE(11))
    expect(call.json.include_existing_subscription).toBe(true)
  })

  test('the borrower plan sends no platform fee at all', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: UPDATE(21), body: ok(null) })
    await tab(page, 'Borrower Enrollment').click()
    await (await withValue(page, '1200.00')).fill('1500')
    await save(page).click()
    await confirm(page).click()
    const call = await expectCall(api, 'PUT', UPDATE(21))
    expect(call.json).toEqual({ total_amount: 1500 })
  })

  test('the user seat plan sends the seat count', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: UPDATE(31), body: ok(null) })
    await tab(page, 'User Seat').click()
    await (await withValue(page, '3')).fill('5')
    await save(page).click()
    await confirm(page).click()
    const call = await expectCall(api, 'PUT', UPDATE(31))
    expect(call.json).toMatchObject({ total_amount: 49, total_seat_count: 5 })
  })

  test('Cancel in the confirmation saves nothing and keeps the edit', async ({ page }) => {
    const api = await open(page)
    await (await withValue(page, '499.00')).fill('549')
    await save(page).click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(confirm(page)).toBeHidden()
    expect(api.find('PUT', '/admin/plan-fee/')).toHaveLength(0)
    await expect(await withValue(page, '549')).toBeVisible()
  })

  test('a status:false response shows the API message', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: UPDATE(11), body: failure('Amount is below the minimum.') })
    await (await withValue(page, '499.00')).fill('1')
    await save(page).click()
    await confirm(page).click()
    await expect(page.getByText('Amount is below the minimum.').first()).toBeVisible()
  })

  test('a server error is reported', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: UPDATE(11), status: 500, body: failure('boom') })
    await (await withValue(page, '499.00')).fill('549')
    await save(page).click()
    await confirm(page).click()
    await expect(page.getByText('Failed to update plan')).toBeVisible()
  })
})
