import { test, expect, type Page, type Route } from '@playwright/test'

// Partner-assisted funding application (the host partner edits a client's
// application), Step 4, Funding Request. Purpose of Funds and Additional
// Funding Types are the same chip picker as in the borrower portal, several at
// once; Purpose of Funds is sent joined in the one purpose_of_funds string. The
// wizard's cards stand out from the page. Every backend call is answered here,
// at the API origin: nothing is saved.
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const HOST_USER = {
  id: 1,
  name: 'Host Admin',
  email: 'host@example.test',
  user_type: 'Admin',
  is_host: 1,
  partner_id: null,
  permissions: [],
}

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null,
  sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'Four Corner Funding', site_slogan: null,
}

const FUNDING = {
  id: 28,
  funding_request_id: 28,
  funding_sequence_id: 3,
  status: 'Draft',
  requested_amount: '30000.00',
  purpose_of_funds: 'Working Capital, Furniture, Fixtures & Equipment (FF&E)',
  purpose_note: null,
  approved_funding: 'SBA 7(a) Loans',
  preferred_funding_type: 'Term Loan',
  additional_funding_types: ['SBA Loan', 'Invoice Factoring'],
  timeframe_needed: null,
  collateral_available: null,
  is_business_info_saved: true,
  is_ownership_info_saved: true,
  is_financial_info_saved: true,
  is_funding_request_saved: true,
}

const BUSINESS = {
  id: 21,
  full_name: 'Jane Borrower',
  business_name: 'Borrower Co',
  business_email: 'jane@example.test',
  business_phone_no: '5125550100',
  business_country: 'United States',
  business_address: '9 Main St',
  business_city: 'Austin',
  business_state: 'Texas',
  business_postal_code: '78701',
  industry_type: 'Retail',
  entity_type: 'LLC',
  years_in_business: '5',
}

async function openFundingRequestStep(page: Page) {
  const sent: { body: Record<string, unknown> | null } = { body: null }

  await page.addInitScript(
    ([user]) => {
      window.localStorage.setItem(
        'auth',
        JSON.stringify({ state: { token: 'e2e-fake-token', user, rememberMe: true }, version: 0 })
      )
      document.cookie = 'auth_session_active=true; path=/'
    },
    [HOST_USER]
  )

  const ok = (route: Route, data: unknown) => route.fulfill({ json: { status: true, message: 'ok', data } })
  await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME }))
  await page.route(`${API_ORIGIN}/common/funding-sequencings/grouped**`, (route) => ok(route, { groups: [] }))
  await page.route(`${API_ORIGIN}/common/funding-application/business-info**`, (route) => ok(route, BUSINESS))
  await page.route(`${API_ORIGIN}/common/funding-application/funding-request**`, (route) => {
    if (route.request().method() === 'POST') {
      sent.body = route.request().postDataJSON()
      return ok(route, { ...FUNDING, ...sent.body })
    }
    return ok(route, FUNDING)
  })

  await page.goto(`/fund-application/${FUNDING.id}`)
  await page.locator('.sidebar-step-btn', { hasText: 'Funding Request' }).filter({ visible: true }).first().click()
  await expect(page.getByText(/Step 4 of \d+: Funding Request/).filter({ visible: true }).first()).toBeVisible()

  return sent
}

// The wizard keeps a second (mobile) copy of the step in the page: the visible one.
const picker = (page: Page, inputId: string) =>
  page.locator('.chip-multiselect', { has: page.locator(`#${inputId}`) }).locator('.p-multiselect').filter({ visible: true })

const look = (el: import('@playwright/test').Locator) =>
  el.evaluate((node) => {
    const css = getComputedStyle(node)
    return { border: css.borderTopColor, shadow: css.boxShadow, outline: css.outlineStyle }
  })

test.describe('Partner funding application › Step 4 › Funding Request', () => {
  test('Purpose of Funds takes several purposes and sends them joined, with the note for Other', async ({ page }) => {
    const sent = await openFundingRequestStep(page)

    const purposes = picker(page, 'purpose_of_funds')
    await expect(purposes.locator('.p-multiselect-token-label')).toHaveText(['Working Capital', 'Furniture, Fixtures & Equipment (FF&E)'])

    await purposes.locator('.p-multiselect-trigger').click()
    await purposes.getByPlaceholder('Search purposes').fill('Other')
    await purposes.locator('.p-multiselect-item', { hasText: /^Other$/ }).click()
    await page.keyboard.press('Escape')

    await page.getByPlaceholder('Please specify the purpose of funds').filter({ visible: true }).fill('Trade show booth')
    await page.getByRole('button', { name: /save/i }).filter({ visible: true }).first().click()

    await expect.poll(() => sent.body?.purpose_of_funds).toBe('Working Capital, Furniture, Fixtures & Equipment (FF&E), Other')
    expect(sent.body?.purpose_note).toBe('Trade show booth')
    expect(sent.body?.additional_funding_types).toEqual(['SBA Loan', 'Invoice Factoring'])
  })

  test('both pickers: chips inside, a search box, no hover or focus colour, primary ticks', async ({ page }) => {
    await openFundingRequestStep(page)

    for (const id of ['purpose_of_funds', 'additional_funding_types']) {
      const field = picker(page, id)
      await expect(field.locator('.p-multiselect-token').first()).toBeVisible()
      await expect(field).toHaveCSS('border-radius', '4px')
      const box = (await field.boundingBox())!
      for (const chip of await field.locator('.p-multiselect-token').all()) {
        const c = (await chip.boundingBox())!
        expect(c.y).toBeGreaterThanOrEqual(box.y)
        expect(c.y + c.height).toBeLessThanOrEqual(box.y + box.height)
      }

      await page.mouse.move(0, 0)
      const atRest = await look(field)
      await field.hover()
      expect(await look(field)).toEqual(atRest)
      await field.locator('.p-multiselect-trigger').click()
      expect(await look(field)).toEqual(atRest)

      const search = field.locator('.p-multiselect-filter')
      await expect(search).toBeVisible()
      await page.mouse.move(0, 0)
      const searchAtRest = await look(search)
      await search.click()
      expect(await look(search)).toEqual(searchAtRest)

      const primary = await field.locator('.p-multiselect-token').first().evaluate((el) => getComputedStyle(el).color)
      const ticked = field.locator('.p-multiselect-item.p-highlight .p-checkbox-box').first()
      await ticked.scrollIntoViewIfNeeded()
      await expect(ticked).toHaveCSS('background-color', primary)
      await expect(ticked).toHaveCSS('border-top-color', primary)

      await page.keyboard.press('Escape')
      await page.mouse.move(0, 0)
    }
  })

  test("the wizard's cards stand out from the page", async ({ page }) => {
    await openFundingRequestStep(page)

    const pageBg = await page.locator('.funding-wizard-page').evaluate((el) => getComputedStyle(el).backgroundColor)
    for (const card of await page.locator('.funding-wizard-page .card').filter({ visible: true }).all()) {
      const css = await card.evaluate((el) => {
        const s = getComputedStyle(el)
        return { width: s.borderTopWidth, color: s.borderTopColor, shadow: s.boxShadow, bg: s.backgroundColor }
      })
      expect(css.width).toBe('1px')
      expect(css.color).not.toBe(css.bg)
      expect(css.color).not.toBe('rgba(0, 0, 0, 0)')
      expect(css.shadow).not.toBe('none')
      expect(css.bg).not.toBe(pageBg)
    }

    if (process.env.UI_SHOT) await page.screenshot({ path: process.env.UI_SHOT, fullPage: false })
  })
})
