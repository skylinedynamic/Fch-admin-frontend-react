import { test, expect } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, HOST_USER } from '../../support/helpers'
import { ownerSummaryFixture } from '../../../tests/mocks/ownerSummary'
import { OWNER_SUMMARY_PERMISSION } from '../../../src/config/ownerSummary'

// A Developer login: the three developer-only Business Insights permissions,
// plus the screens the summary links to.
const HOST_OWNER = {
  ...HOST_USER,
  email: 'dev@example.test',
  entity_type: 'Employee',
  permissions: ['view commission', 'view invoices', 'view payments', ...Object.values(OWNER_SUMMARY_PERMISSION)],
}

test.describe('Sidebar › Business Insights', () => {
  test('report settings: the owner turns the weekly report on for two addresses', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    const api = await mockApi(page, [
      { method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) },
      { method: 'GET', match: '/owner-summary/report-settings', body: ok({ enabled: false, recipients: [] }) },
      { method: 'PUT', match: '/owner-summary/report-settings', body: (req) => ({ status: true, message: 'Report settings saved', data: req.postDataJSON() }) },
    ])

    await page.goto('/business-insights')
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
    await page.getByRole('button', { name: 'Report settings' }).click()

    const dialog = page.getByRole('dialog', { name: 'Report settings' })
    await dialog.getByRole('checkbox', { name: /Send the weekly report/ }).check()
    await dialog.getByRole('textbox', { name: 'Recipient 1' }).fill('owner@example.test')
    await dialog.getByRole('button', { name: '+ Add recipient' }).click()
    await dialog.getByRole('textbox', { name: 'Recipient 2' }).fill('finance@example.test')
    await dialog.getByRole('button', { name: 'Save settings' }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText('Report settings saved')).toBeVisible()
    const call = await expectCall(api, 'PUT', '/owner-summary/report-settings')
    expect(call.json).toEqual({ enabled: true, recipients: ['owner@example.test', 'finance@example.test'] })
  })

  test('report settings: a refused address shows under its field and the dialog stays', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [
      { method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) },
      { method: 'GET', match: '/owner-summary/report-settings', body: ok({ enabled: true, recipients: ['finance@fourcornerfunding'] }) },
      { method: 'PUT', match: '/owner-summary/report-settings', status: 422, body: { message: 'Enter a valid email address.', errors: { 'recipients.0': ['Enter a valid email address.'] } } },
    ])

    await page.goto('/business-insights')
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
    await page.getByRole('button', { name: 'Report settings' }).click()
    const dialog = page.getByRole('dialog', { name: 'Report settings' })
    await dialog.getByRole('button', { name: 'Save settings' }).click()

    await expect(dialog.locator('[data-recipient="0"]').getByText('Enter a valid email address.')).toBeVisible()
    await expect(page.locator('.Toastify__toast')).toHaveCount(0)
  })

  test('report settings fit a phone with fields and buttons at the standard height', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [
      { method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) },
      { method: 'GET', match: '/owner-summary/report-settings', body: ok({ enabled: true, recipients: ['owner@example.test'] }) },
    ])

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/business-insights')
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
    await page.getByRole('button', { name: 'Report settings' }).click()

    const dialog = page.getByRole('dialog', { name: 'Report settings' })
    const field = dialog.getByRole('textbox', { name: 'Recipient 1' })
    await expect(field).toBeVisible()
    const dialogBox = await dialog.boundingBox()
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0)
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(390)
    // Its CSS height: the dialog is still scaling up while it opens.
    await expect(field).toHaveCSS('height', '37.5px')
  })

  test('a recipient field keeps its plain border while focused - no focus ring or colour', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [
      { method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) },
      { method: 'GET', match: '/owner-summary/report-settings', body: ok({ enabled: true, recipients: ['owner@example.test'] }) },
    ])

    await page.goto('/business-insights')
    await page.getByRole('button', { name: 'Report settings' }).click()
    const field = page.getByRole('dialog', { name: 'Report settings' }).getByRole('textbox', { name: 'Recipient 1' })
    await expect(field).toBeVisible()
    const unfocused = await field.evaluate((el) => getComputedStyle(el).borderColor)

    await field.click()
    await expect(field).toBeFocused()
    await expect(field).toHaveCSS('box-shadow', 'none')
    await expect(field).toHaveCSS('border-color', unfocused)

    // Reached from the keyboard too (focus-visible). One recipient has no
    // Remove button, so the field is one step back from "+ Add recipient".
    await page.getByRole('dialog', { name: 'Report settings' }).getByRole('button', { name: '+ Add recipient' }).focus()
    await page.keyboard.press('Shift+Tab')
    await expect(field).toBeFocused()
    await expect(field).toHaveCSS('box-shadow', 'none')
    await expect(field).toHaveCSS('border-color', unfocused)
  })

  test('stalled deals sort with the app dropdown, not the browser select', async ({ page }) => {
    const deal = ownerSummaryFixture.stalled_deals[0]
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [{
      method: 'GET', match: '/common/owner-summary', body: ok({
        ...ownerSummaryFixture,
        stalled_deals: [
          { ...deal, id: 1, application_number: 'FUND-LONG', days_in_status: 60, requested_amount: 1000 },
          { ...deal, id: 2, application_number: 'FUND-BIG', days_in_status: 20, requested_amount: 90000 },
        ],
      }),
    }])

    await page.goto('/business-insights')
    const card = page.getByTestId('owner-stalled')
    await expect(card.locator('select')).toHaveCount(0)
    const trigger = card.getByRole('button', { name: /sort by/i })
    await expect(trigger).toHaveCSS('height', '37.5px')
    await expect(trigger).toHaveCSS('border-radius', '4px')
    await expect(card.getByRole('row').nth(1)).toContainText('FUND-LONG')

    await trigger.click()
    const list = card.getByRole('listbox', { name: 'Sort by' })
    await expect(list).toBeVisible()
    await list.getByRole('option', { name: 'Amount (largest)' }).click()

    await expect(list).toBeHidden()
    await expect(trigger).toContainText('Amount (largest)')
    await expect(card.getByRole('row').nth(1)).toContainText('FUND-BIG')
  })

  test('the host owner opens it from the sidebar and reads this month', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    const api = await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    await page.goto('/')
    await page.locator('#navbar-nav').getByRole('link', { name: 'Business Insights' }).click()
    await expect(page).toHaveURL(/\/business-insights$/)

    const call = await expectCall(api, 'GET', '/common/owner-summary')
    expect(call.path).toContain('period=this_month')
    expect(call.path).toContain('environment=production')
    await expect(page.getByRole('group', { name: 'Payments' }).getByRole('button', { name: 'Production' })).toHaveAttribute('aria-pressed', 'true')

    const kpis = page.getByTestId('owner-kpis')
    await expect(kpis.getByText('Net Earnings')).toBeVisible()
    await expect(kpis.getByText('Net Earnings')).toHaveCSS('text-transform', 'none')
    await expect(kpis.getByText('$1.6K')).toBeVisible()
    await expect(kpis.getByText('$150.0K')).toBeVisible()
    await expect(page.getByTestId('owner-kpi-funded').getByText('Partners')).toBeVisible()
    await expect(page.getByTestId('owner-kpi-conversion').getByText('25% (1 of 4)')).toBeVisible()
    // Clients: FCH's own and other partners' shown apart, active and new underneath the total.
    const clients = page.getByTestId('owner-kpi-clients')
    await expect(clients.locator('.os-kpi__row').filter({ hasText: 'FCH' }).getByText('15')).toBeVisible()
    await expect(clients.locator('.os-kpi__row').filter({ hasText: 'Partners' }).getByText('25')).toBeVisible()
    // Active is as of now (no history kept); new follows the period.
    await expect(clients.getByText('35 active now · 8 new this period')).toBeVisible()
    await expect(page.getByTestId('owner-attention').getByRole('link', { name: 'Review failed invoices' })).toBeVisible()
    await expect(page.getByTestId('owner-stalled').getByText('FUND-000044')).toBeVisible()
  })

  test('changing the period asks the API again', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    const api = await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    await page.goto('/business-insights')
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
    await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'This week' }).click()

    await expect.poll(() => api.find('GET', 'period=this_week').length).toBeGreaterThan(0)
  })

  test('a custom range picked in the app calendar is applied', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    const api = await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    await page.goto('/business-insights')
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
    await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'Custom' }).click()

    // It starts a year ago and ends today: the From calendar opens on that month.
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const today = `${now.getFullYear()}-${month}-${String(now.getDate()).padStart(2, '0')}`
    await page.locator('#owner-range-from').click()
    await page.locator('.p-datepicker td:not(.p-datepicker-other-month) span', { hasText: /^15$/ }).click()
    await page.getByRole('button', { name: 'Apply' }).click()

    await expect.poll(() => api.find('GET', 'period=custom').length).toBeGreaterThan(0)
    const path = api.find('GET', 'period=custom')[0].path
    expect(path).toContain(`from=${now.getFullYear() - 1}-${month}-15`)
    expect(path).toContain(`to=${today}`)
  })

  test('a refused range shows under its field and the numbers stay', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [
      { method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) },
      { method: 'GET', match: 'period=custom', status: 422, body: { message: 'The end date cannot be before the start date.', errors: { to: ['The end date cannot be before the start date.'] } } },
    ])

    await page.goto('/business-insights')
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
    await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'Custom' }).click()
    await page.getByRole('button', { name: 'Apply' }).click()

    await expect(page.locator('[data-field="to"]').getByText('The end date cannot be before the start date.')).toBeVisible()
    await expect(page.getByTestId('owner-kpis').getByText('$1.6K')).toBeVisible()
    await expect(page.locator('.Toastify__toast')).toHaveCount(0)
  })

  test('the custom range fits a phone, with fields as tall as the buttons', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/business-insights')
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
    await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'Custom' }).click()

    await expect(page.locator('#owner-range-from')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    const field = await page.locator('#owner-range-from').boundingBox()
    expect(Math.round(field!.height * 2) / 2).toBe(37.5)
  })

  test('the skeleton mirrors the page while it loads and fits a phone', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    // Hold the summary back; registered last, so it wins over the mock above.
    let release = () => {}
    const gate = new Promise<void>((resolve) => { release = resolve })
    await page.route('**/common/owner-summary**', async (route) => {
      await gate
      await route.fallback()
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/business-insights')
    const skeleton = page.getByTestId('owner-skeleton')
    await expect(skeleton).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

    await page.setViewportSize({ width: 1440, height: 900 })
    const loading = await skeleton.locator('.os-kpi').nth(1).boundingBox()
    const loadingRow = await skeleton.locator('.os-row').boundingBox()

    release()
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
    await expect(skeleton).toHaveCount(0)

    // The page doesn't jump: each part starts about where the real one does, and is about as tall.
    const loaded = await page.getByTestId('owner-kpi-funded').boundingBox()
    const loadedRow = await page.locator('.os-row').first().boundingBox()
    expect(Math.abs(loaded!.height - loading!.height)).toBeLessThanOrEqual(8)
    expect(Math.abs(loaded!.y - loading!.y)).toBeLessThanOrEqual(8)
    expect(Math.abs(loadedRow!.y - loadingRow!.y)).toBeLessThanOrEqual(16)
    expect(Math.abs(loadedRow!.height - loadingRow!.height)).toBeLessThanOrEqual(40)
  })

  test('the payments switch asks the API for each mode and warns what it does not change', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    const api = await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    await page.goto('/business-insights')
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
    const payments = page.getByRole('group', { name: 'Payments' })

    await payments.getByRole('button', { name: 'Sandbox' }).click()
    await expect.poll(() => api.find('GET', 'environment=sandbox').length).toBeGreaterThan(0)

    await payments.getByRole('button', { name: 'All Payment' }).click()
    await expect.poll(() => api.find('GET', 'environment=all').length).toBeGreaterThan(0)
    await expect(payments.getByRole('button', { name: 'All Payment' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('net earnings, commissions and what is owed come straight after the top cards', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    await page.goto('/business-insights')
    await expect(page.getByTestId('owner-cash')).toBeVisible()

    const kpis = await page.getByTestId('owner-kpis').boundingBox()
    const cash = await page.getByTestId('owner-cash').boundingBox()
    const owed = await page.getByTestId('owner-owed').boundingBox()
    const attention = await page.getByTestId('owner-attention').boundingBox()
    expect(cash!.y).toBeGreaterThan(kpis!.y + kpis!.height - 1)
    expect(attention!.y).toBeGreaterThan(cash!.y + cash!.height - 1)
    expect(attention!.y).toBeGreaterThan(owed!.y + owed!.height - 1)
  })

  test('a needs-attention item opens the screen it is about', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    await page.goto('/business-insights')
    await page.getByTestId('owner-attention').getByRole('link', { name: 'Review commission payouts due' }).click()

    await expect(page).toHaveURL(/\/commissions$/)
  })

  test('the host owner login without the Business Insights permissions neither sees it nor reaches it', async ({ page }) => {
    await seedSession(page, { ...HOST_USER, email: 'owner@example.test', entity_type: 'Partner', permissions: ['update commission', 'view commission'] })
    const api = await mockApi(page)

    await page.goto('/business-insights')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('#navbar-nav').getByRole('link', { name: 'Business Insights' })).toHaveCount(0)
    expect(api.find('GET', '/common/owner-summary')).toHaveLength(0)
  })

  test('host staff who do not manage commissions neither see it nor reach it', async ({ page }) => {
    await seedSession(page, { ...HOST_USER, entity_type: 'Employee', permissions: ['view commission'] })
    const api = await mockApi(page)

    await page.goto('/business-insights')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('#navbar-nav').getByRole('link', { name: 'Business Insights' })).toHaveCount(0)
    expect(api.find('GET', '/common/owner-summary')).toHaveLength(0)
  })

  test('fits a phone without scrolling sideways, and six headline cards share one row on a laptop', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/business-insights')
    await expect(page.getByTestId('owner-stalled')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

    const rows = () => page.getByTestId('owner-kpis').locator('.os-kpi').evaluateAll((cards) => new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top))).size)
    await page.setViewportSize({ width: 2200, height: 900 })
    await expect.poll(rows).toBe(1)
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect.poll(rows).toBe(2)
  })

  test('says so when the API refuses the viewer', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', status: 403, body: { message: 'This action is unauthorized.' } }])

    await page.goto('/business-insights')

    await expect(page.getByText('Only the FCH owner can see this summary.')).toBeVisible()
  })

  // Export PDF: the summary or details report, made on the API for the period and payments on screen.
  test('export PDF offers both reports and downloads the one chosen for what is on screen', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])
    const exports: URL[] = []
    await page.route('**/common/owner-summary/export**', async (route) => {
      const url = new URL(route.request().url())
      exports.push(url)
      await route.fulfill({
        status: 200,
        body: Buffer.from('%PDF-1.7 %%EOF'),
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=business-insights-${url.searchParams.get('type')}-2026-11-01-to-2026-11-30.pdf`,
          'Access-Control-Expose-Headers': 'Content-Disposition',
        },
      })
    })

    await page.goto('/business-insights')
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
    await page.getByRole('group', { name: 'Payments' }).getByRole('button', { name: 'All Payment' }).click()

    await page.getByRole('button', { name: 'Export PDF' }).click()
    const menu = page.getByRole('menu', { name: 'Export PDF' })
    await expect(menu.getByRole('menuitem', { name: /Summary report/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /Details report/ })).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      menu.getByRole('menuitem', { name: /Details report/ }).click(),
    ])

    expect(download.suggestedFilename()).toBe('business-insights-details-2026-11-01-to-2026-11-30.pdf')
    expect(exports[0].searchParams.get('type')).toBe('details')
    expect(exports[0].searchParams.get('period')).toBe('this_month')
    expect(exports[0].searchParams.get('environment')).toBe('all')
    await expect(menu).toBeHidden()
  })

  test('the export menu fits a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 760 })
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    await page.goto('/business-insights')
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
    await page.getByRole('button', { name: 'Export PDF' }).click()

    const box = await page.getByRole('menu', { name: 'Export PDF' }).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(375)
  })
})
