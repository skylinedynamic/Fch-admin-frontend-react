import { test, expect, type Page, type Route } from '@playwright/test'

// Partner-assisted funding application (the host edits a client's application),
// Step 2, Ownership Information: the owner's and a co-borrower's Social
// Security Number are the one SSN field - masked ***-**-1234 at rest, edited on
// a click, the digits on the eye button. Every backend call is answered here,
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
  id: 15,
  funding_request_id: 15,
  funding_sequence_id: 3,
  status: 'Draft',
  is_business_info_saved: true,
  is_ownership_info_saved: true,
}

const BUSINESS = {
  id: 21, full_name: 'Jane Borrower', business_name: 'Borrower Co', business_email: 'jane@example.test',
  business_phone_no: '5125550100', business_country: 'United States', business_address: '9 Main St',
  business_city: 'Austin', business_state: 'Texas', business_postal_code: '78701',
  industry_type: 'Retail', entity_type: 'LLC', years_in_business: '5',
}

const OWNER = {
  id: 31, first_name: 'Jane', last_name: 'Borrower', date_of_birth: '1990-04-05', ssn: '325555555',
  citizenship_status: 'US Citizen', street_address: '9 Main St', city: 'Austin', state: 'Texas', zip_code: '78701',
  country: 'United States', ownership: 60, phone_number: '(512) 555-0100', has_co_borrower: true,
  co_borrowers: [{ id: 41, first_name: 'Cora', last_name: 'Co', role: 'Owner', ownership: 40, ssn: '234567890', date_of_birth: '1985-05-05' }],
}

async function openOwnershipStep(page: Page) {
  await page.addInitScript(
    ([user]) => {
      window.localStorage.setItem('auth', JSON.stringify({ state: { token: 'e2e-fake-token', user, rememberMe: true }, version: 0 }))
      document.cookie = 'auth_session_active=true; path=/'
    },
    [HOST_USER]
  )

  const ok = (route: Route, data: unknown) => route.fulfill({ json: { status: true, message: 'ok', data } })
  await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME }))
  await page.route(`${API_ORIGIN}/common/funding-sequencings/grouped**`, (route) => ok(route, { groups: [] }))
  await page.route(`${API_ORIGIN}/common/funding-application/business-info**`, (route) => ok(route, BUSINESS))
  await page.route(`${API_ORIGIN}/common/funding-application/funding-request**`, (route) => ok(route, FUNDING))
  await page.route(`${API_ORIGIN}/common/funding-application/ownership-info**`, (route) => ok(route, OWNER))

  await page.goto(`/fund-application/${FUNDING.id}`)
  await page.locator('.sidebar-step-btn', { hasText: 'Ownership' }).filter({ visible: true }).first().click()
  await expect(page.getByText(/Step 2 of \d+: Ownership Information/).filter({ visible: true }).first()).toBeVisible()
}

// The wizard keeps a second (mobile) copy of the step in the page: the visible one.
const visible = (page: Page, selector: string) => page.locator(selector).filter({ visible: true }).first()

test.describe('Fund application (partner) › Step 2 › SSN', () => {
  test('the owner SSN is masked, has the eye button, and is edited on a click', async ({ page }) => {
    await openOwnershipStep(page)

    const ssn = visible(page, '#owner-ssn')
    await expect(ssn).toHaveValue('***-**-5555')
    const eye = ssn.locator('xpath=following-sibling::button[1]')
    await expect(eye).toBeVisible()
    await expect(eye.locator('i.ri-eye-2-line')).toBeVisible()
    await ssn.locator('xpath=..').screenshot({ path: 'test-results/owner-ssn.png' })

    await eye.click()
    await expect(ssn).toHaveValue('325-55-5555')
    await eye.click()
    await expect(ssn).toHaveValue('***-**-5555')

    await ssn.click()
    await expect(ssn).toHaveAttribute('type', 'password')
    await ssn.fill('')
    await ssn.pressSequentially('234567891')
    await expect(ssn).toHaveValue('234-56-7891')
  })
  test('the co-borrower modal: SSN with the eye button, phone examples a real number, a full-width date of birth', async ({ page }) => {
    await openOwnershipStep(page)

    await page.locator('.btn-add-coborrower').filter({ visible: true }).first().click()
    const modal = page.locator('#coBorrowerModal')
    await expect(modal).toBeVisible()

    const ssn = modal.locator('#co-borrower-ssn')
    await expect(ssn.locator('xpath=following-sibling::button[1]').locator('i.ri-eye-2-line')).toBeVisible()

    await expect(modal.getByPlaceholder('(555) 555-5555')).toHaveCount(2)
    await expect(modal.getByPlaceholder('(123) 456-7890')).toHaveCount(0)

    // Its column, not the calendar input's own width: as wide as the phone beside it.
    const dob = modal.getByPlaceholder('Select date of birth').filter({ visible: true })
    const phone = modal.getByPlaceholder('(555) 555-5555').nth(1)
    const dobBox = (await dob.boundingBox())!
    const column = (await dob.locator('xpath=ancestor::div[contains(@class,"col-md-6")][1]').boundingBox())!
    expect(dobBox.width).toBeGreaterThan(column.width - 30)
    expect(dobBox.width).toBeGreaterThan((await phone.boundingBox())!.width)
    await modal.locator('.modal-body').screenshot({ path: 'test-results/co-borrower-modal.png' })
  })
})
