import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('Dashboard', () => {
  test('greets the signed-in user by first name', async ({ page }) => {
    await seedSession(page, { first_name: 'Hosta' })
    const api = await mockApi(page, [{ method: 'GET', match: '/common/dashboard', body: ok({}) }])
    await page.goto('/')
    await expect(page.getByText('Welcome, Hosta!')).toBeVisible()
    await expectCall(api, 'GET', '/common/dashboard')
  })

  // The login API sends `name` only, no `first_name` (see dashboard.live.spec.ts).
  test('greets a user from the login response by the first word of their name', async ({ page }) => {
    await seedSession(page, { name: 'Craig Rice' })
    await mockApi(page, [{ method: 'GET', match: '/common/dashboard', body: ok({}) }])
    await page.goto('/')
    await expect(page.getByText('Welcome, Craig!')).toBeVisible()
  })

  test('falls back to a generic greeting when the name is unknown', async ({ page }) => {
    await seedSession(page, { name: '' })
    await mockApi(page, [{ method: 'GET', match: '/common/dashboard', body: ok({}) }])
    await page.goto('/')
    await expect(page.getByText('Welcome, User!')).toBeVisible()
  })

  // One person, two companies: staff must see which company each application is for.
  test('Recent Funding Applications shows the company next to the borrower, with a narrow funding type', async ({ page }) => {
    const longType = 'Working Capital, Payroll, Inventory, Marketing, Expansion, Equipment, Ground-Up Development, Refinance Debt'
    await seedSession(page, { first_name: 'Hosta' })
    await mockApi(page, [
      {
        method: 'GET',
        match: '/common/dashboard',
        body: ok({
          latest_funding_applications: [
            { id: 1, purpose_of_funds: longType, formatted_created_at: 'Oct 19, 2026', borrower: 'Michael Chen', business_name: 'Alpha Tech Solutions', entity_type: 'S-Corporation', requested_amount: 1000, total_funded_amount: 0, status: 'Pending' },
            { id: 2, purpose_of_funds: 'Business Acquisition', formatted_created_at: 'Oct 15, 2026', borrower: 'Michael Chen', business_name: 'Chen Logistics Inc', entity_type: 'LLC', requested_amount: 2000, total_funded_amount: 0, status: 'Approved' },
          ],
        }),
      },
    ])
    await page.goto('/')

    const card = page.locator('.card').filter({ hasText: 'Recent Funding Applications' })
    const headers = (await card.locator('thead th').allTextContents()).map((h) => h.trim().toLowerCase())
    expect(headers[headers.indexOf('borrower') + 1]).toBe('company name')
    expect(headers).not.toContain('entity type')

    const rows = card.locator('tbody tr')
    await expect(rows.nth(0)).toContainText('Alpha Tech Solutions')
    await expect(rows.nth(1)).toContainText('Chen Logistics Inc')

    // The long funding type no longer stretches the table: one line, at most 260px, full text on hover.
    const fundingType = rows.nth(0).locator('td').first()
    expect((await fundingType.boundingBox())!.width).toBeLessThanOrEqual(300)
    await expect(fundingType.locator('[title]')).toHaveAttribute('title', longType)
  })

  test('a signed-out visitor is sent to the login page', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })
})
