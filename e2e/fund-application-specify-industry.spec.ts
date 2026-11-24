import { test, expect, type Page, type Request } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from './support/helpers'

// Ticket 509: the partner / host wizard's Step 1 (Business Information) shows a
// required "Specify Industry" field when Industry Type is Other, saves it with
// the application and hides it for every other industry; the details page
// shows it. Every backend call is answered here: nothing is saved.

const FUNDING = {
  id: 15,
  funding_request_id: 15,
  funding_sequence_id: 3,
  status: 'Draft',
  is_business_info_saved: true,
}

const BUSINESS = {
  id: 21, full_name: 'Juan Alvarado', business_name: 'M&H Telecom, Inc', business_email: 'owner@mh.test',
  business_phone_no: '(561) 603-5852', business_country: 'United States', business_country_code: '+1',
  business_address: '3554 Cypress Edge Drive', business_city: 'Lake Worth', business_state: 'Florida',
  business_postal_code: '33467', industry_type: 'Other', industry_type_note: null as string | null,
  entity_type: 'S-Corporation', years_in_business: '7 Years 9 Months 30 Days', number_of_employees: '3',
  funding_request_id: 15,
}

const SAVE = '/common/funding-application/business-info'

async function openBusinessStep(page: Page, business: Partial<typeof BUSINESS> = {}): Promise<ApiMock> {
  await seedSession(page)
  const saved = { ...BUSINESS, ...business }
  const api = await mockApi(page, [
    { match: '/common/funding-sequencings/grouped', body: ok({ groups: [] }) },
    { method: 'GET', match: '/common/funding-application/funding-request', body: ok(FUNDING) },
    { method: 'GET', match: SAVE, body: ok(saved) },
    // A save answers with what was sent, as the API does.
    { method: 'POST', match: SAVE, body: (req: Request) => ok({ ...saved, ...JSON.parse(req.postData() || '{}') }) },
  ])
  await page.goto(`/fund-application/${FUNDING.id}`)
  await expect(stepHeading(page, 1)).toBeVisible()
  await expect(visible(page, 'input[placeholder="Enter full name"]')).toHaveValue('Juan Alvarado')
  return api
}

// The wizard keeps a second (mobile) copy of the step in the page: the visible one.
const visible = (page: Page, selector: string) => page.locator(selector).filter({ visible: true }).first()
const stepHeading = (page: Page, step: number) =>
  page.getByText(new RegExp(`Step ${step} of \\d+:`)).filter({ visible: true }).first()
const specifyIndustry = (page: Page) => visible(page, '#industry_type_note')
const saveAndNext = (page: Page) => page.getByRole('button', { name: /Save & Next/ }).filter({ visible: true }).first().click()

async function chooseIndustry(page: Page, industry: string) {
  const column = page
    .locator('.col-md-6')
    .filter({ has: page.locator('label', { hasText: /^Industry Type/ }) })
    .filter({ visible: true })
    .first()
  await column.locator('.form-select').click()
  await column.locator('.list-group-item', { hasText: industry }).first().click()
}

test.describe('Fund application (partner) › Step 1 › Specify Industry (ticket 509)', () => {
  test('Other shows a required Specify Industry; Save & Next waits for it, then saves it trimmed', async ({ page }) => {
    const api = await openBusinessStep(page)

    const field = specifyIndustry(page)
    await expect(field).toBeVisible()
    await expect(field).toHaveValue('')
    await expect(field.locator('xpath=preceding-sibling::label[1]')).toContainText('Specify Industry')
    await expect(field.locator('xpath=preceding-sibling::label[1]').locator('.text-danger')).toHaveText('*')

    await field.fill('   ')
    await saveAndNext(page)
    await expect(page.getByText('Please specify the industry when Industry Type is Other.').filter({ visible: true })).toBeVisible()
    await expect(field).toHaveClass(/is-invalid/)
    expect(api.find('POST', SAVE)).toHaveLength(0)
    await expect(stepHeading(page, 1)).toBeVisible()
    await field.locator('xpath=ancestor::form[1]').screenshot({ path: 'test-results/partner-specify-industry-required.png' })

    await field.fill('  Telecommunications Infrastructure  ')
    await saveAndNext(page)

    const call = await expectCall(api, 'POST', SAVE)
    expect(call.json).toMatchObject({ industry_type: 'Other', industry_type_note: 'Telecommunications Infrastructure' })
    await expect(stepHeading(page, 2)).toBeVisible()
  })

  test('reopens with the saved value, and choosing another industry hides it and clears it', async ({ page }) => {
    const api = await openBusinessStep(page, { industry_type_note: 'Telecommunications Infrastructure' })

    await expect(specifyIndustry(page)).toHaveValue('Telecommunications Infrastructure')

    await chooseIndustry(page, 'Manufacturing')
    await expect(page.locator('#industry_type_note').filter({ visible: true })).toHaveCount(0)

    await saveAndNext(page)
    const call = await expectCall(api, 'POST', SAVE)
    expect(call.json).toMatchObject({ industry_type: 'Manufacturing', industry_type_note: null })
  })

  test('is hidden for any other industry, and appears when Other is chosen', async ({ page }) => {
    await openBusinessStep(page, { industry_type: 'Information Technology & Software' })

    await expect(page.locator('#industry_type_note').filter({ visible: true })).toHaveCount(0)

    await chooseIndustry(page, 'Other')
    await expect(specifyIndustry(page)).toBeVisible()
    await expect(specifyIndustry(page)).toHaveValue('')
  })

  test("the server's message for the field is shown on it", async ({ page }) => {
    const api = await openBusinessStep(page, { industry_type_note: 'Telecom' })
    api.add({
      method: 'POST', match: SAVE, status: 422,
      body: failure('Specify Industry cannot exceed 255 characters.', { industry_type_note: 'Specify Industry cannot exceed 255 characters.' }),
    })

    await saveAndNext(page)
    await expect(page.getByText('Specify Industry cannot exceed 255 characters.').filter({ visible: true }).first()).toBeVisible()
    await expect(specifyIndustry(page)).toHaveClass(/is-invalid/)
    await expect(stepHeading(page, 1)).toBeVisible()
  })
})

const DETAIL = /\/common\/request-application\/funding-application\/107$/
const APPLICATION = {
  id: 107, partner_id: 1, borrower_id: 1, status: 'Draft',
  funding_request_id: 47, funding_request_status: 'Approved', is_editable: true,
  full_name: 'Juan Alvarado', business_name: 'M&H Telecom, Inc', co_borrowers: [], documents: [],
}

async function openDetails(page: Page, application: Record<string, unknown>) {
  await seedSession(page, { id: 1, is_host: 1, partner_id: 1, permissions: ['view funding application'] })
  await mockApi(page, [{ method: 'GET', match: DETAIL, body: ok({ ...APPLICATION, ...application }) }])
  await page.goto('/intake-review/funding-application/107')
  await expect(page.getByText('Industry Type', { exact: true }).first()).toBeVisible()
}

test.describe('Funding application details › Specify Industry (ticket 509)', () => {
  test('shows the industry specified for Other', async ({ page }) => {
    await openDetails(page, { industry_type: 'Other', industry_type_note: 'Telecommunications Infrastructure' })

    await expect(page.getByText('Specify Industry', { exact: true })).toBeVisible()
    await expect(page.getByText('Telecommunications Infrastructure')).toBeVisible()
  })

  test('shows no Specify Industry row for any other industry', async ({ page }) => {
    await openDetails(page, { industry_type: 'Manufacturing', industry_type_note: null })

    await expect(page.getByText('Manufacturing', { exact: true })).toBeVisible()
    await expect(page.getByText('Specify Industry', { exact: true })).toHaveCount(0)
  })
})
