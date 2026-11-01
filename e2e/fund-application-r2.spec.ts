import { test, expect, type Page, type Route } from '@playwright/test'
import { seedSession } from './support/helpers'

// QA round 2, partner-assisted funding application (the host edits a client's
// application):
// - R2 BUG-031: an owner or co-borrower under 18 could be picked and saved.
//   The date pickers stop 18 years back; the API refuses a younger owner.
// - R2 BUG-032: a Purpose Note of 256-500 characters gave a 500 error. The
//   field takes up to 500, with a counter, and is saved in full.
// - R2 BUG-033: a tab left open on an older copy overwrote what was saved
//   since. Each save carries the version it was made from; the API refuses an
//   older one with 409 and the page says so, with a Reload button.
// Every backend call is answered here: nothing is saved.

const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const FUNDING = {
  id: 28, funding_request_id: 28, funding_sequence_id: 3, status: 'Draft',
  requested_amount: '30000.00', purpose_of_funds: 'Working Capital, Other', purpose_note: 'Trade show booth',
  approved_funding: 'SBA 7(a) Loans', preferred_funding_type: 'Term Loan', additional_funding_types: [],
  timeframe_needed: null, collateral_available: null,
  is_business_info_saved: true, is_ownership_info_saved: true, is_financial_info_saved: true, is_funding_request_saved: true,
  version: '2030-11-01 10:00:00',
}

const BUSINESS = {
  id: 21, full_name: 'Jane Borrower', business_name: 'Borrower Co', business_email: 'jane@example.test',
  business_phone_no: '5125550100', business_country: 'United States', business_address: '9 Main St',
  business_city: 'Austin', business_state: 'Texas', business_postal_code: '78701',
  industry_type: 'Retail', entity_type: 'LLC', years_in_business: '5', version: FUNDING.version,
}

const OWNER = {
  id: 31, first_name: 'Jane', last_name: 'Borrower', date_of_birth: '1990-04-05', ssn: '325555555',
  citizenship_status: 'US Citizen', street_address: '9 Main St', city: 'Austin', state: 'Texas', zip_code: '78701',
  country: 'United States', ownership: 100, phone_number: '(512) 555-0100', has_co_borrower: false, co_borrowers: [],
  version: FUNDING.version,
}

type Sent = { body: Record<string, any> | null }
type FundingSave = { status: number; json: unknown }

async function openWizard(page: Page, fundingSave: (body: Record<string, any>) => FundingSave = (body) => ({ status: 200, json: { status: true, message: 'ok', data: { ...FUNDING, ...body } } })) {
  const sent: Sent = { body: null }
  await seedSession(page)

  const ok = (route: Route, data: unknown) => route.fulfill({ json: { status: true, message: 'ok', data } })
  await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { site_name: 'Four Corner Funding' }))
  await page.route(`${API_ORIGIN}/common/funding-sequencings/grouped**`, (route) => ok(route, { groups: [] }))
  await page.route(`${API_ORIGIN}/common/funding-application/business-info**`, (route) => ok(route, BUSINESS))
  await page.route(`${API_ORIGIN}/common/funding-application/ownership-info**`, (route) => ok(route, OWNER))
  await page.route(`${API_ORIGIN}/common/funding-application/funding-request**`, (route) => {
    if (route.request().method() !== 'POST') return ok(route, FUNDING)
    sent.body = route.request().postDataJSON()
    const answer = fundingSave(sent.body!)
    return route.fulfill({ status: answer.status, json: answer.json })
  })

  await page.goto(`/fund-application/${FUNDING.id}`)
  return sent
}

async function openStep(page: Page, name: string, heading: RegExp) {
  await page.locator('.sidebar-step-btn', { hasText: name }).filter({ visible: true }).first().click()
  await expect(page.getByText(heading).filter({ visible: true }).first()).toBeVisible()
}

// The wizard keeps a second (mobile) copy of each step in the page: the visible one.
const visible = (page: Page, selector: string) => page.locator(selector).filter({ visible: true }).first()
const save = (page: Page) => page.getByRole('button', { name: /save/i }).filter({ visible: true }).first()
const note = (page: Page) => page.getByPlaceholder('Please specify the purpose of funds').filter({ visible: true }).first()

/** Y-m-d of the latest birthday that is 18 today, in the browser's clock. */
const latestAdultDate = (page: Page) =>
  page.evaluate(() => {
    const t = new Date()
    const d = new Date(t.getFullYear() - 18, t.getMonth(), t.getDate())
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

test.describe('Partner funding application › owner date of birth (R2 BUG-031)', () => {
  test("the owner's date picker stops at 18 years ago", async ({ page }) => {
    await openWizard(page)
    await openStep(page, 'Ownership', /Step 2 of \d+: Ownership Information/)

    await expect(visible(page, 'input[placeholder="Select date of birth"]')).toHaveValue('5 Apr, 1990')
    // The flatpickr instance behind Date of Birth.
    const maxDate = await page
      .locator('input.flatpickr-input')
      .evaluateAll((inputs) => {
        const fp = inputs.map((i: any) => i._flatpickr).find((f: any) => f && f.config?.maxDate)
        return fp ? fp.formatDate(fp.config.maxDate, 'Y-m-d') : null
      })
    expect(maxDate).toBe(await latestAdultDate(page))
  })

  test("the API's refusal of an under-18 owner is shown under Date of Birth", async ({ page }) => {
    await openWizard(page)
    await page.route(`${API_ORIGIN}/common/funding-application/ownership-info**`, (route) => {
      if (route.request().method() !== 'POST') return route.fulfill({ json: { status: true, message: 'ok', data: OWNER } })
      return route.fulfill({
        status: 422,
        json: { status: false, message: 'Invalid', errors: { date_of_birth: ['The owner must be at least 18 years old.'] } },
      })
    })
    await openStep(page, 'Ownership', /Step 2 of \d+: Ownership Information/)

    await save(page).click()

    await expect(page.getByText('The owner must be at least 18 years old.').filter({ visible: true }).first()).toBeVisible()
  })
})

test.describe('Partner funding application › Purpose Note (R2 BUG-032)', () => {
  test('takes up to 500 characters with a counter, and a 300-character note is saved in full', async ({ page }) => {
    const sent = await openWizard(page)
    await openStep(page, 'Funding Request', /Step 4 of \d+: Funding Request/)

    await expect(note(page)).toHaveValue('Trade show booth')
    await expect(note(page)).toHaveAttribute('maxlength', '500')

    const longNote = 'n'.repeat(300)
    await note(page).fill(longNote)
    await expect(page.getByText('300/500').filter({ visible: true }).first()).toBeVisible()
    await save(page).click()

    await expect.poll(() => sent.body?.purpose_note).toBe(longNote)
  })

  test('stops at 500 characters', async ({ page }) => {
    await openWizard(page)
    await openStep(page, 'Funding Request', /Step 4 of \d+: Funding Request/)

    await note(page).fill('x'.repeat(500))
    // Typing on at the limit adds nothing.
    await note(page).pressSequentially('yyyyy')

    await expect(note(page)).toHaveValue('x'.repeat(500))
    await expect(page.getByText('500/500').filter({ visible: true }).first()).toBeVisible()
  })
})

test.describe('Partner funding application › saved from an older copy (R2 BUG-033)', () => {
  test('a save carries the version the page was loaded with', async ({ page }) => {
    const sent = await openWizard(page)
    await openStep(page, 'Funding Request', /Step 4 of \d+: Funding Request/)

    await save(page).click()

    await expect.poll(() => sent.body?.expected_version).toBe(FUNDING.version)
  })

  test('a 409 says the application changed, offers Reload, and keeps what was typed', async ({ page }) => {
    const message = 'This application was changed in another tab or by someone else since you opened it. Reload to see the latest before saving.'
    const sent = await openWizard(page, () => ({ status: 409, json: { status: false, message } }))
    await openStep(page, 'Funding Request', /Step 4 of \d+: Funding Request/)

    await note(page).fill('Booth and travel')
    await save(page).click()

    await expect.poll(() => sent.body?.expected_version).toBe(FUNDING.version)
    const toast = page.locator('.Toastify__toast', { hasText: message })
    await expect(toast).toBeVisible()
    await expect(toast.getByRole('button', { name: 'Reload' })).toBeVisible()
    await expect(note(page)).toHaveValue('Booth and travel')
    await expect(page.getByText(/Step 4 of \d+: Funding Request/).filter({ visible: true }).first()).toBeVisible()
  })
})
