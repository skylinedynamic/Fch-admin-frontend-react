import { test, expect, type Page, type Route } from '@playwright/test'

// Embed Form › Loan Applications › details: converting a submission whose email
// already belongs to a borrower.
//
// The Convert modal first asks GET .../conversion-preview, so it names the
// existing client (and says a new funding application will be generated)
// before Confirm. Confirming sends confirm_existing_borrower. If a client
// appears after the preview, the API still answers the convert with 409 and
// who the borrower is, and the modal switches to them. The API used to answer 500 here (a mangled
// exception class name in fch-api's EmbedFormService), so the partner never saw
// the question - the backend side is covered by fch-api's
// EmbedFormConvertExistingBorrowerTest. Backend calls are intercepted at the
// API origin (see activity-visibility.spec.ts for the pattern).
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const HOST_USER = {
  id: 1,
  name: 'Host Admin',
  email: 'host@example.test',
  user_type: 'Admin',
  is_host: 1,
  partner_id: null,
  permissions: ['view application', 'convert application', 'view funding application'],
}

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null,
  sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'Four Corner Funding', site_slogan: null,
}

const SUBMISSION = {
  id: 3,
  submission_uid: 'e2e-submission-3',
  partner_id: 1,
  first_name: 'Odessa',
  last_name: 'Mccall',
  email: 'odessa@example.test',
  status: 'new',
  attachments: [],
  co_borrowers: [],
  created_at: '2026-10-15 09:00:00',
}

const EXISTING_BORROWER = {
  id: 42,
  name: 'Odessa Mccall',
  email: 'odessa@example.test',
  phone_number: '(512) 555-0100',
  business_name: 'Mccall Holdings LLC',
  status: 'active',
  partner_name: 'Host Co',
  funding_applications_count: 1,
  created_at: '2026-09-01T10:00:00Z',
}

async function seedHostSession(page: Page) {
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
}

function jsonOk(route: Route, data: unknown, message = 'ok') {
  return route.fulfill({ json: { status: true, message, data } })
}

test.describe('Embed Form › Loan application › convert onto an existing borrower', () => {
  let convertBodies: Record<string, unknown>[]

  test.beforeEach(async ({ page }) => {
    convertBodies = []
    await seedHostSession(page)

    await page.route(`${API_ORIGIN}/**`, (route) => jsonOk(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => jsonOk(route, { ...THEME, branding: THEME }))
    await page.route(`${API_ORIGIN}/common/embed-forms/submissions/3`, (route) => jsonOk(route, SUBMISSION))
    await page.route(`${API_ORIGIN}/common/embed-forms/submissions/3/convert-to-borrower`, (route) => {
      const body = route.request().postDataJSON() ?? {}
      convertBodies.push(body)

      if (!body.confirm_existing_borrower) {
        return route.fulfill({
          status: 409,
          json: {
            status: false,
            message: 'A borrower with this email already exists.',
            code: 'existing_borrower_confirmation_required',
            data: { existing_borrower: EXISTING_BORROWER },
          },
        })
      }

      return jsonOk(route, {
        id: 42,
        is_existing_borrower: true,
        is_free_trail: true,
        funding_application_id: 77,
      }, 'Converted to the existing borrower.')
    })

    await page.goto('/embed-form/loan-applications/3')
  })

  const PREVIEW = `${API_ORIGIN}/common/embed-forms/submissions/3/conversion-preview`
  const CONFIRM_EXISTING = /Use Existing Client & Create Funding Application/

  async function openModal(page: Page) {
    await page.getByRole('button', { name: /Convert to Free Plan Borrower/ }).first().click()
  }

  test('names the existing client before anything is sent', async ({ page }) => {
    await page.route(PREVIEW, (route) => jsonOk(route, { mode: 'existing_borrower', existing_borrower: EXISTING_BORROWER }))
    await openModal(page)

    const modal = page.locator('.modal.show')
    await expect(modal.getByText('Existing Client Found')).toBeVisible()
    await expect(modal.getByText('This client already exists')).toBeVisible()
    await expect(modal.getByText(/No new client account will be created/)).toBeVisible()
    await expect(modal.getByText('A new funding application will be generated for this client.')).toBeVisible()
    await expect(modal.getByText('Mccall Holdings LLC')).toBeVisible()
    expect(convertBodies).toHaveLength(0)
  })

  test('converts onto that client once confirmed', async ({ page }) => {
    await page.route(PREVIEW, (route) => jsonOk(route, { mode: 'existing_borrower', existing_borrower: EXISTING_BORROWER }))
    await openModal(page)
    await page.locator('.modal.show').getByRole('button', { name: CONFIRM_EXISTING }).click()

    await expect.poll(() => convertBodies.length).toBe(1)
    expect(convertBodies[0]).toMatchObject({ confirm_existing_borrower: true })
    // The modal closes once converted.
    await expect(page.locator('.modal.show')).toHaveCount(0)
  })

  test('switches to the existing client when one appears after the preview', async ({ page }) => {
    await page.route(PREVIEW, (route) => jsonOk(route, { mode: 'new_borrower', existing_borrower: null }))
    await openModal(page)

    const modal = page.locator('.modal.show')
    await expect(modal.getByText('No existing client found')).toBeVisible()
    await modal.getByRole('button', { name: /Create Client & Funding Application/ }).click()

    await expect(modal.getByText('This client already exists')).toBeVisible()
    expect(convertBodies).toHaveLength(1)
    expect(convertBodies[0]).not.toHaveProperty('confirm_existing_borrower')

    await modal.getByRole('button', { name: CONFIRM_EXISTING }).click()
    await expect.poll(() => convertBodies.length).toBe(2)
    expect(convertBodies[1]).toMatchObject({ confirm_existing_borrower: true })
  })

  test('offers the new funding application as soon as it is created', async ({ page }) => {
    await page.route(PREVIEW, (route) => jsonOk(route, { mode: 'existing_borrower', existing_borrower: EXISTING_BORROWER }))
    await openModal(page)
    await page.locator('.modal.show').getByRole('button', { name: CONFIRM_EXISTING }).click()

    const view = page.getByRole('button', { name: /View Funding Application/ })
    await expect(view).toBeVisible()
    await view.click()

    await expect(page).toHaveURL(/\/intake-review\/funding-application\/77$/)
  })
})
