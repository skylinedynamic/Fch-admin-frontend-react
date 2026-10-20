import { test, expect, type Page, type Route } from '@playwright/test'

// Leads, as the host partner sees them: every partner's leads, each with the
// partner that owns it (just before the salesperson), and a Partner filter.
// Converting another partner's borrower lead first asks which partner the
// borrower belongs to - the lead owner (selected by default) or the host - and
// the conversion carries that choice as convert_as. fch-api's HostLeadAccessTest covers the API side (who
// sees which leads, and which partner the borrower is filed under). Backend
// calls are intercepted at the API origin (see activity-visibility.spec.ts).
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const HOST_USER = {
  id: 1,
  name: 'Host Admin',
  email: 'host@example.test',
  user_type: 'Admin',
  entity_type: 'Partner',
  is_host: 1,
  partner_id: 1,
  permissions: ['view leads', 'update leads', 'delete leads'],
}

const PARTNERS = [
  { id: 1, full_name: 'Hal Host', company_name: 'Host Co' },
  { id: 2, full_name: 'Wil Label', company_name: 'WLP Co' },
]

const WLP_USER = { ...HOST_USER, id: 2, name: 'WLP Admin', user_type: 'Partner', is_host: 0, partner_id: 2 }

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null,
  sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'Four Corner Funding', site_slogan: null,
}

const leadOf = (id: number, partner: { id: number; company_name: string }, convertAsOptions: unknown[]) => ({
  id,
  lead_type: 'Borrower',
  status: 'New Lead',
  contact_person: `Lee Lead ${id}`,
  company_name: `Lead Co ${id}`,
  email: `lead-${id}@example.test`,
  phone_number: '(555) 123-4567',
  country: 'United States',
  state: 'Texas',
  city: 'Austin',
  lead_source: 'Website',
  convert_to: null,
  convert_email_already: false,
  partner: { id: partner.id, full_name: 'Owner', company_name: partner.company_name },
  convert_as_options: convertAsOptions,
})

const WLP_LEAD = leadOf(7, { id: 2, company_name: 'WLP Co' }, [
  { value: 'host', company_name: 'Host Co' },
  { value: 'lead_partner', company_name: 'WLP Co' },
])
const HOST_LEAD = leadOf(8, { id: 1, company_name: 'Host Co' }, [])
const BORROWER_PLAN = { id: 11, name: 'Standard', enrollment_type: 'One Time', total_amount: 500, platform_fee: 0 }

async function seedSession(page: Page, user: typeof HOST_USER) {
  await page.addInitScript(
    ([u]) => {
      window.localStorage.setItem(
        'auth',
        JSON.stringify({ state: { token: 'e2e-fake-token', user: u, rememberMe: true }, version: 0 })
      )
      document.cookie = 'auth_session_active=true; path=/'
    },
    [user]
  )
}

function jsonOk(route: Route, data: unknown, extra: Record<string, unknown> = {}) {
  return route.fulfill({ json: { status: true, message: 'ok', data, ...extra } })
}

async function stubApi(page: Page, leads: unknown[], convertBodies: Record<string, unknown>[], fetchBodies: Record<string, unknown>[] = []) {
  await page.route(`${API_ORIGIN}/**`, (route) => jsonOk(route, []))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => jsonOk(route, { ...THEME, branding: THEME }))
  await page.route(`${API_ORIGIN}/admin/partners/fetch-partners`, (route) => jsonOk(route, PARTNERS))
  await page.route(`${API_ORIGIN}/common/leads/fetch-leads`, (route) => {
    const body = route.request().postDataJSON() ?? {}
    fetchBodies.push(body)
    const shown = body.partner_id ? leads.filter((l) => (l as { partner: { id: number } }).partner.id === body.partner_id) : leads
    return jsonOk(route, shown, { meta: { total: shown.length }, statistics: { total_leads: shown.length, new_leads: 0, qualified_rate: 0, declined_rate: 0 } })
  })
  await page.route(`${API_ORIGIN}/common/borrower-plans`, (route) => jsonOk(route, [BORROWER_PLAN]))
  await page.route(`${API_ORIGIN}/common/leads/*/convert`, (route) => {
    convertBodies.push(route.request().postDataJSON() ?? {})
    return jsonOk(route, { id: 99 })
  })
}

const rowOf = (page: Page, contact: string) => page.locator('tr', { hasText: contact })
const shownModal = (page: Page) => page.locator('.modal.show')

test.describe('Leads › host converting another partner\'s lead', () => {
  let convertBodies: Record<string, unknown>[]

  test.beforeEach(() => {
    convertBodies = []
  })

  test('shows the host the partner that owns each lead, before the salesperson', async ({ page }) => {
    await seedSession(page, HOST_USER)
    await stubApi(page, [WLP_LEAD, HOST_LEAD], convertBodies)
    await page.goto('/leads')

    await expect(page.getByRole('columnheader', { name: /^Partner/ })).toBeVisible()
    const headers = (await page.getByRole('columnheader').allTextContents()).map((h) => h.trim()).filter(Boolean)
    expect(headers).toEqual(['Lead', 'Contact Info', 'Source', 'Partner', 'SalesPerson', 'Status', 'Action'])
    await expect(rowOf(page, 'Lee Lead 7')).toContainText('WLP Co')
    await expect(rowOf(page, 'Lee Lead 8')).toContainText('Host Co')
  })

  test('every lead value still shows, stacked into fewer columns', async ({ page }) => {
    // The host's table fits beside the sidebar from 1440px wide.
    await page.setViewportSize({ width: 1440, height: 900 })
    await seedSession(page, HOST_USER)
    await stubApi(page, [{ ...WLP_LEAD, salesperson_name: 'Sal Person' }], convertBodies)
    await page.goto('/leads')

    const row = rowOf(page, 'Lee Lead 7')
    for (const value of ['Lee Lead 7', 'Lead Co 7', 'lead-7@example.test', '(555) 123-4567', 'Website', 'WLP Co', 'Sal Person', 'New Lead', 'Borrower']) {
      await expect(row).toContainText(value)
    }
    // No horizontal scroll inside the table.
    const overflow = await page.locator('.p-datatable-wrapper').evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  for (const width of [1440, 1920]) {
    test(`Contact Info and Source keep their width on a ${width}px screen, the others taking the extra room`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await seedSession(page, HOST_USER)
      await stubApi(page, [{ ...WLP_LEAD, salesperson_name: 'Sal Person' }], convertBodies)
      await page.goto('/leads')
      await expect(rowOf(page, 'Lee Lead 7')).toBeVisible()

      const widthOf = (name: RegExp) => page.getByRole('columnheader', { name }).evaluate((el) => el.getBoundingClientRect().width)
      expect(await widthOf(/^Contact Info/)).toBeLessThanOrEqual(192)
      expect(await widthOf(/^Source/)).toBeLessThanOrEqual(152)

      // At that width the header stays on one line and a typical email doesn't wrap.
      const lineHeight = (locator: ReturnType<typeof page.locator>) => locator.evaluate((el) => el.getBoundingClientRect().height)
      const header = page.getByRole('columnheader', { name: /^Contact Info/ }).locator('.p-column-title')
      expect(await lineHeight(header)).toBeLessThan(24)
      const email = rowOf(page, 'Lee Lead 7').getByText('lead-7@example.test')
      expect(await lineHeight(email)).toBeLessThan(26)
    })
  }

  test('Contact Info and Source stay narrow, a long email wrapping after its @', async ({ page }) => {
    // Wide enough for the table's minimum, so the columns are not stretched to fill it.
    await page.setViewportSize({ width: 1280, height: 900 })
    const longEmail = 'christopher.longname@fourcornerholdings.example'
    await seedSession(page, HOST_USER)
    await stubApi(page, [{ ...WLP_LEAD, email: longEmail, lead_source: 'Personal Network (Friends/Family)' }], convertBodies)
    await page.goto('/leads')

    const row = rowOf(page, 'Lee Lead 7')
    await expect(row).toContainText(longEmail)
    await expect(row).toContainText('Personal Network (Friends/Family)')

    const widthOf = (name: RegExp) => page.getByRole('columnheader', { name }).evaluate((el) => el.getBoundingClientRect().width)
    expect(await widthOf(/^Contact Info/)).toBeLessThanOrEqual(240)
    // Its longest word, "(Friends/Family)", can't break, so it sets this width.
    expect(await widthOf(/^Source/)).toBeLessThanOrEqual(150)

    // The email breaks only between its two halves.
    const halves = await row.locator('.text-nowrap', { hasText: /@|fourcorner/ }).allTextContents()
    expect(halves).toEqual(['christopher.longname@', 'fourcornerholdings.example'])
  })

  test('the Partner filter narrows the list to that partner', async ({ page }) => {
    const fetchBodies: Record<string, unknown>[] = []
    await seedSession(page, HOST_USER)
    await stubApi(page, [WLP_LEAD, HOST_LEAD], convertBodies, fetchBodies)
    await page.goto('/leads')
    await expect(rowOf(page, 'Lee Lead 8')).toBeVisible()

    await page.locator('.p-dropdown', { hasText: 'All Partners' }).click()
    await page.locator('.p-dropdown-panel .p-dropdown-item', { hasText: /^WLP Co$/ }).click()
    await page.getByRole('button', { name: /Filters/ }).click()

    await expect.poll(() => fetchBodies[fetchBodies.length - 1]?.partner_id).toBe(2)
    await expect(rowOf(page, 'Lee Lead 7')).toBeVisible()
    await expect(rowOf(page, 'Lee Lead 8')).toHaveCount(0)
  })

  test('a white-label partner sees no owner column', async ({ page }) => {
    await seedSession(page, WLP_USER)
    await stubApi(page, [{ ...WLP_LEAD, convert_as_options: [] }], convertBodies)
    await page.goto('/leads')

    await expect(rowOf(page, 'Lee Lead 7')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /^Partner/ })).toHaveCount(0)
    await expect(page.locator('.p-dropdown', { hasText: 'All Partners' })).toHaveCount(0)
  })

  for (const [company, convertAs] of [['Host Co', 'host'], ['WLP Co', 'lead_partner']] as const) {
    test(`choosing ${company} converts the lead as its borrower`, async ({ page }) => {
      await seedSession(page, HOST_USER)
      await stubApi(page, [WLP_LEAD], convertBodies)
      await page.goto('/leads')

      const rowButton = rowOf(page, 'Lee Lead 7').getByRole('button', { name: /Convert to Borrower/ })
      await expect(rowButton).toHaveText('Convert to Borrower')
      await rowButton.click()

      const ownerModal = shownModal(page)
      await expect(ownerModal.getByRole('definition').filter({ hasText: 'WLP Co' })).toBeVisible()
      await expect(ownerModal.getByRole('radio', { name: /WLP Co, Lead owner/ })).toBeChecked()

      // The two partners sit side by side as a grid of cards.
      // Measured once the modal's opening animation has settled.
      const cards = async () => Promise.all([
        ownerModal.locator('label', { hasText: 'Lead owner' }).boundingBox(),
        ownerModal.locator('label', { hasText: 'Host partner' }).boundingBox(),
      ])
      await expect.poll(async () => { const [o, h] = await cards(); return Math.abs(o!.y - h!.y) }).toBeLessThan(2)
      const [ownerCard, hostCard] = await cards()
      expect(hostCard!.x).toBeGreaterThan(ownerCard!.x + ownerCard!.width - 1)
      if (convertAs === 'host') await ownerModal.locator('label', { hasText: company }).click()
      await ownerModal.getByRole('button', { name: /Continue/ }).click()

      await shownModal(page).getByRole('button', { name: 'Convert to Borrower' }).click()

      await expect.poll(() => convertBodies.length).toBe(1)
      expect(convertBodies[0]).toMatchObject({ convert_as: convertAs, plan_id: 11 })
    })
  }

  test('cancelling the choice converts nothing', async ({ page }) => {
    await seedSession(page, HOST_USER)
    await stubApi(page, [WLP_LEAD], convertBodies)
    await page.goto('/leads')

    await rowOf(page, 'Lee Lead 7').getByRole('button', { name: /Convert to Borrower/ }).click()
    await shownModal(page).getByRole('button', { name: 'Cancel' }).click()

    await expect(page.locator('.modal.show')).toHaveCount(0)
    expect(convertBodies).toHaveLength(0)
  })

  test('the host\'s own lead converts without the choice', async ({ page }) => {
    await seedSession(page, HOST_USER)
    await stubApi(page, [HOST_LEAD], convertBodies)
    await page.goto('/leads')

    await rowOf(page, 'Lee Lead 8').getByRole('button', { name: /Convert to Borrower/ }).click()
    await shownModal(page).getByRole('button', { name: 'Convert to Borrower' }).click()

    await expect.poll(() => convertBodies.length).toBe(1)
    expect(convertBodies[0]).not.toHaveProperty('convert_as')
    await expect(page.locator('.modal.show label', { hasText: 'Lead owner' })).toHaveCount(0)
  })
})

// Converting asks for missing details only when a field the missing-info form
// marks required is empty; state and city are optional.
test.describe('Leads › missing info before converting', () => {
  test('a lead with no state or city goes straight to the conversion', async ({ page }) => {
    const convertBodies: Record<string, unknown>[] = []
    await seedSession(page, HOST_USER)
    await stubApi(page, [{ ...HOST_LEAD, state: '', city: null }], convertBodies)
    await page.goto('/leads')

    await rowOf(page, 'Lee Lead 8').getByRole('button', { name: /Convert to Borrower/ }).click()

    await expect(shownModal(page).getByText('Convert Lead to Borrower')).toBeVisible()
    await expect(page.getByText('Borrower Conversion: Missing Info')).toBeHidden()
    await shownModal(page).getByRole('button', { name: 'Convert to Borrower' }).click()
    await expect.poll(() => convertBodies.length).toBe(1)
  })

  test('a lead with no phone number is asked for it first', async ({ page }) => {
    const convertBodies: Record<string, unknown>[] = []
    await seedSession(page, HOST_USER)
    await stubApi(page, [{ ...HOST_LEAD, phone_number: '', state: '', city: null }], convertBodies)
    await page.goto('/leads')

    await rowOf(page, 'Lee Lead 8').getByRole('button', { name: /Convert to Borrower/ }).click()

    await expect(shownModal(page).getByText('Borrower Conversion: Missing Info')).toBeVisible()
    expect(convertBodies).toHaveLength(0)
  })
})
