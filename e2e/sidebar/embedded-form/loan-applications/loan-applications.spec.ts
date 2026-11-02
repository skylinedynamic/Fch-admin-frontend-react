import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, pickPrime, confirmDelete, type ApiMock } from '../../../support/helpers'

const EF = '/common/embed-forms'

const SUBMISSIONS = [
  { id: 1401, first_name: 'Ada', last_name: 'Applicant', email: 'ada@example.test', phone: '(555) 140-0001', desired_funding_amount: 75000, status: 'new', created_at: '2026-03-05T10:00:00Z' },
  { id: 1402, first_name: 'Ben', last_name: 'Borrowed', email: 'ben@example.test', phone: '(555) 140-0002', desired_funding_amount: 20000, status: 'converted', created_at: '2026-03-01T10:00:00Z',
    converted_borrower: { id: 42, full_name: 'Owner Client Two', is_free_trail: false, enrollment_type: 'One Time Payment' } },
]

test.describe('Loan applications (embed form submissions)', () => {
  const LIST = `${EF}/submissions/fetch`

  async function open(page: Page, permissions = ['view application', 'convert application']): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(SUBMISSIONS) }])
    await page.goto('/embed-form/loan-applications')
    await expect(page.getByText('ada@example.test')).toBeVisible()
    return api
  }

  test('lists submissions', async ({ page }) => {
    await open(page)
    await expect(page.getByText('ben@example.test')).toBeVisible()
  })

  // The API sends { data: [...], meta } with meta beside data. The page used to
  // look for meta inside data, so the total fell back to the size of the page.
  test('the cards and the paginator use the totals the API sends, not the page size', async ({ page }) => {
    await seedSession(page, { permissions: ['view application'] })
    await mockApi(page, [{
      method: 'POST', match: LIST,
      body: paginated(SUBMISSIONS, {
        meta: { total: 25, per_page: 10, current_page: 1, last_page: 3, stats: { total: 25, new_count: 14, reviewing_count: 3, converted_count: 8 } },
      }),
    }])
    await page.goto('/embed-form/loan-applications')
    await expect(page.getByText('ada@example.test')).toBeVisible()
    await expect(page.locator('.card', { hasText: 'Total Applications' }).first()).toContainText('25')
    await expect(page.locator('.card', { hasText: 'New Applications' }).first()).toContainText('14')
    await expect(page.locator('.p-paginator-page')).toHaveCount(3)
  })

  test('a business name is sent to the API as the search term', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Search here...').fill('Acme Holdings')
    await page.getByPlaceholder('Search here...').press('Enter')
    await expect.poll(() => api.find('POST', LIST).at(-1)?.json.search).toBe('Acme Holdings')
  })

  // BUG-058: the badge names the client's real plan; the row keeps the submitted name.
  test("a converted submission shows its client's plan badge instead of the convert button", async ({ page }) => {
    await open(page)
    const converted = page.locator('tr', { hasText: 'ben@example.test' })
    await expect(converted.getByText('One Time Payment')).toBeVisible()
    await expect(converted.getByText('Ben Borrowed')).toBeVisible()
    await expect(converted.getByRole('button', { name: /convert to free plan borrower/i })).toHaveCount(0)
    await expect(page.locator('tr', { hasText: 'ada@example.test' }).getByRole('button', { name: /convert to free plan borrower/i })).toBeVisible()
  })

  // A rejected application says Rejected in the Action column instead of a
  // disabled convert button.
  test('a rejected application shows Rejected instead of the convert button', async ({ page }) => {
    await seedSession(page, { permissions: ['view application', 'convert application'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([{ ...SUBMISSIONS[0], status: 'rejected' }, SUBMISSIONS[1]]) }])
    await page.goto('/embed-form/loan-applications')

    const rejected = page.locator('tr', { hasText: 'ada@example.test' })
    await expect(rejected.getByTitle('Rejected applications cannot be converted. Change the status to convert it.')).toHaveText(/Rejected/)
    await expect(rejected.getByRole('button', { name: /convert to free plan borrower/i })).toHaveCount(0)
  })

  test('the Applicant column shows only the name', async ({ page }) => {
    await seedSession(page, { permissions: ['view application'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([{ ...SUBMISSIONS[0], business_name: 'Applicant Holdings LLC', submission_uid: 'abcdef1234567890' }]) }])
    await page.goto('/embed-form/loan-applications')

    const nameCell = page.locator('td', { hasText: 'Ada Applicant' })
    await expect(nameCell).toBeVisible()
    await expect(nameCell).not.toContainText('Applicant Holdings LLC')
    await expect(nameCell).not.toContainText('#abcdef12')
  })

  test('the convert button is hidden without the convert permission', async ({ page }) => {
    await open(page, ['view application'])
    await expect(page.getByRole('button', { name: /convert to free plan borrower/i })).toHaveCount(0)
  })

  test('search is trimmed and sent to the API', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Search here...').fill('  ada  ')
    await page.getByPlaceholder('Search here...').press('Enter')
    await expect.poll(() => api.find('POST', LIST).at(-1)?.json.search).toBe('ada')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view application'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/embed-form/loan-applications')
    await expect(page.getByText('No form submissions found')).toBeVisible()
  })

  test('clicking a row opens the application, clicking convert does not', async ({ page }) => {
    await open(page)
    await page.locator('tr', { hasText: 'ada@example.test' }).getByRole('button', { name: /convert to free plan borrower/i }).click()
    await expect(page).toHaveURL(/\/embed-form\/loan-applications$/)
  })

  // Ticked applications are deleted from the Actions button, as on Partners and
  // Clients. A converted one belongs to a client, so its box is disabled.
  test('deletes the ticked applications from Actions; a converted one cannot be ticked', async ({ page }) => {
    await seedSession(page, { permissions: ['view application'] })
    const api = await mockApi(page, [
      { method: 'POST', match: LIST, body: paginated(SUBMISSIONS) },
      { method: 'POST', match: `${EF}/submissions/delete`, body: ok({ deleted: 1 }, 'Applications deleted successfully.') },
    ])
    await page.goto('/embed-form/loan-applications')
    await expect(page.getByText('ada@example.test')).toBeVisible()

    await expect(page.locator('tr', { hasText: 'ben@example.test' }).locator('input.p-checkbox-input')).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Actions' })).toHaveCount(0)

    await page.locator('tr', { hasText: 'ada@example.test' }).locator('.p-checkbox').click()
    await expect(page).toHaveURL(/\/embed-form\/loan-applications$/) // ticking does not open the row
    await page.locator('.dropdown-toggle-split').click()
    await page.getByRole('button', { name: /Delete Selected/ }).click()
    await confirmDelete(page)

    const call = await expectCall(api, 'POST', `${EF}/submissions/delete`)
    expect(call.json).toEqual({ ids: [1401] })
  })

  test('the host can filter the list by partner', async ({ page }) => {
    await seedSession(page, { permissions: ['view application'] })
    const api = await mockApi(page, [
      { method: 'POST', match: LIST, body: paginated(SUBMISSIONS) },
      { method: 'POST', match: '/common/get-all-partners', body: ok([{ id: 4, company_name: 'Acme Lending', full_name: 'Pat Partner' }, { id: 9, company_name: 'Zeta Funding', full_name: 'Zed Z' }]) },
    ])
    await page.goto('/embed-form/loan-applications')
    await expect(page.getByText('ada@example.test')).toBeVisible()

    await pickPrime(page, page.locator('.p-dropdown', { hasText: 'All Partners' }), /Zeta Funding/)
    await page.getByRole('button', { name: /Filters/ }).click()

    await expect.poll(() => api.find('POST', LIST).some((c) => c.json?.partner_id === 9)).toBe(true)
  })

  test('clicking a row opens the application', async ({ page }) => {
    await open(page)
    await page.getByText('ada@example.test').click()
    await expect(page).toHaveURL(/\/embed-form\/loan-applications\/1401$/)
  })

  test('the old /embed-form/submissions URL redirects to the new list', async ({ page }) => {
    await seedSession(page, { permissions: ['view application'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(SUBMISSIONS) }])
    await page.goto('/embed-form/submissions')
    await expect(page).toHaveURL(/\/embed-form\/loan-applications$/)
  })

  test('an old /embed-form/submissions/:id link redirects to the same application', async ({ page }) => {
    await seedSession(page, { permissions: ['view application'] })
    await mockApi(page, [{ method: 'GET', match: `${EF}/submissions/1401`, body: ok(SUBMISSIONS[0]) }])
    await page.goto('/embed-form/submissions/1401')
    await expect(page).toHaveURL(/\/embed-form\/loan-applications\/1401$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/embed-form/loan-applications')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Loan application details', () => {
  async function open(page: Page, submission: Record<string, unknown> = SUBMISSIONS[0], permissions = ['view application', 'convert application']): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'GET', match: new RegExp(`${EF}/submissions/\\d+$`), body: ok(submission) }])
    await page.goto(`/embed-form/loan-applications/${submission.id}`)
    await expect(page.getByText('Loan Application Details').first()).toBeVisible()
    return api
  }
  const statusDropdown = (page: Page) => page.locator('.p-dropdown').filter({ hasText: /New|Reviewing|Rejected|Converted|Set status/ }).first()

  test('changing the status PUTs it and confirms', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: `${EF}/submissions/1401/status`, body: ok(null, 'Status updated successfully.') })
    await pickPrime(page, statusDropdown(page), 'Reviewing')
    const call = await expectCall(api, 'PUT', `${EF}/submissions/1401/status`)
    expect(call.json).toEqual({ status: 'reviewing' })
    await expect(page.getByText('Status updated successfully.')).toBeVisible()
  })

  // The page shows what the server saved, not only what was clicked: a details
  // request still in flight used to put the old status back in the dropdown.
  test('the status shown after a change is the one the server returned', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: `${EF}/submissions/1401/status`, body: ok({ ...SUBMISSIONS[0], status: 'rejected' }, 'Status updated successfully.') })
    await pickPrime(page, statusDropdown(page), 'Reviewing')
    await expectCall(api, 'PUT', `${EF}/submissions/1401/status`)
    await expect(statusDropdown(page)).toContainText('Rejected')
  })

  test('the API refusing a status is shown and rolled back', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: `${EF}/submissions/1401/status`, status: 422, body: failure('A converted application cannot change status.') })
    await pickPrime(page, statusDropdown(page), 'Reviewing')
    await expect(page.getByText('A converted application cannot change status.').first()).toBeVisible()
    await expect(statusDropdown(page)).toContainText('New')
  })

  // The modal asks the API what converting would do before it offers Confirm.
  const PREVIEW = `${EF}/submissions/1401/conversion-preview`
  const EXISTING = { id: 55, name: 'Ada Existing', email: 'ada@example.test', partner_name: 'Acme', funding_applications_count: 2 }
  const previewNew = ok({ mode: 'new_borrower', existing_borrower: null })

  test('a new email says a new client and a new funding application will be created', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'GET', match: PREVIEW, body: previewNew })
    await page.getByRole('button', { name: /convert to free plan borrower/i }).first().click()
    const modal = page.locator('.ef-convert-modal.show')
    await expect(modal.locator('.modal-title')).toHaveText('Create New Client')
    await expect(modal.getByText('No existing client found')).toBeVisible()
    await expect(modal.getByText('A new funding application will be generated for this client.')).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Create Client & Funding Application' })).toBeVisible()
  })

  test('an existing client is named before Confirm, which then converts onto them', async ({ page }) => {
    const api = await open(page)
    const CONVERT = `${EF}/submissions/1401/convert-to-borrower`
    api.add({ method: 'GET', match: PREVIEW, body: ok({ mode: 'existing_borrower', existing_borrower: EXISTING }) })
    api.add({ method: 'POST', match: CONVERT, body: ok({ id: 55, funding_application_id: 91, is_existing_borrower: true }, 'Funding application created for the existing borrower.') })
    await page.getByRole('button', { name: /convert to free plan borrower/i }).first().click()
    const modal = page.locator('.ef-convert-modal.show')
    await expect(modal.locator('.modal-title')).toHaveText('Existing Client Found')
    await expect(modal.getByText('This client already exists')).toBeVisible()
    await expect(modal.getByText('A new funding application will be generated for this client.')).toBeVisible()
    await expect(modal.getByText('Ada Existing')).toBeVisible()

    await modal.getByRole('button', { name: 'Use Existing Client & Create Funding Application' }).click()
    await expect.poll(() => api.find('POST', CONVERT).at(-1)?.json.confirm_existing_borrower).toBe(true)
    await expect(page.getByText('Funding application created for the existing borrower.')).toBeVisible()
  })

  test('a submission the API will not convert says why and offers no Confirm', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'GET', match: PREVIEW, status: 422, body: failure('This application has already been converted.') })
    await page.getByRole('button', { name: /convert to free plan borrower/i }).first().click()
    const modal = page.locator('.ef-convert-modal.show')
    await expect(modal.getByText('This application has already been converted.')).toBeVisible()
    await expect(modal.locator('.modal-footer .btn-primary')).toHaveCount(0)
  })

  test('converting an application that is already converted shows the refusal', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'GET', match: PREVIEW, body: previewNew })
    api.add({ method: 'POST', match: `${EF}/submissions/1401/convert-to-borrower`, status: 422, body: failure('This application has already been converted.') })
    await page.getByRole('button', { name: /convert to free plan borrower/i }).first().click()
    await page.locator('.ef-convert-modal.show .modal-footer .btn-primary').click()
    await expect(page.getByText('This application has already been converted.').first()).toBeVisible()
  })

  // A client created between the preview and Confirm: the API still asks (409).
  test('an existing borrower must be confirmed before the funding application is created', async ({ page }) => {
    const api = await open(page)
    const CONVERT = `${EF}/submissions/1401/convert-to-borrower`
    api.add({ method: 'GET', match: PREVIEW, body: previewNew })
    api.add({
      method: 'POST', match: CONVERT, status: 409,
      body: { status: false, message: 'A borrower with this email already exists.', code: 'existing_borrower_confirmation_required', data: { existing_borrower: EXISTING } },
    })
    await page.getByRole('button', { name: /convert to free plan borrower/i }).first().click()
    const modal = page.locator('.ef-convert-modal.show')
    await modal.locator('.modal-footer .btn-primary').click()
    await expect(modal.locator('.modal-title')).toHaveText('Existing Client Found')
    await expect(modal.getByText('Ada Existing')).toBeVisible()
    expect(api.find('POST', CONVERT).at(-1)?.json.confirm_existing_borrower).toBeUndefined()

    api.add({ method: 'POST', match: CONVERT, body: ok({ id: 55, funding_application_id: 91, is_existing_borrower: true }, 'Funding application created for the existing borrower.') })
    await modal.locator('.modal-footer .btn-primary').click()
    await expect.poll(() => api.find('POST', CONVERT).at(-1)?.json.confirm_existing_borrower).toBe(true)
    await expect(page.getByText('Funding application created for the existing borrower.')).toBeVisible()
  })

  test('a failed status change is rolled back', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: `${EF}/submissions/1401/status`, status: 500, body: failure('Status service is down.') })
    await pickPrime(page, statusDropdown(page), 'Rejected')
    await expect(page.getByText('Status service is down.').first()).toBeVisible()
    await expect(statusDropdown(page)).toContainText('New')
  })

  // A rejected application: the disabled Convert button stays in line with the
  // Status select (the reason is a hover tooltip, not a line under it).
  test('on a rejected application the disabled Convert button lines up with the Status select', async ({ page }) => {
    await open(page, { ...SUBMISSIONS[0], status: 'rejected' })
    const convert = page.getByRole('button', { name: /convert to free plan borrower/i }).first()
    await expect(convert).toBeDisabled()
    await expect(page.locator('[title="Rejected applications cannot be converted. Change the status to convert it."]')).toBeVisible()

    const select = await statusDropdown(page).boundingBox()
    const button = await convert.boundingBox()
    expect(Math.abs((select!.y + select!.height) - (button!.y + button!.height))).toBeLessThanOrEqual(2)
  })

  test('a converted application locks the status and links to the borrower', async ({ page }) => {
    await open(page, { ...SUBMISSIONS[1], converted_borrower_id: 55, borrower_id: 55 })
    await expect(statusDropdown(page)).toHaveClass(/p-disabled/)
    await expect(page.getByRole('button', { name: /convert to free plan borrower/i })).toHaveCount(0)
  })

  test('the convert button is hidden without the convert permission', async ({ page }) => {
    await open(page, SUBMISSIONS[0], ['view application'])
    await expect(page.getByRole('button', { name: /convert to free plan borrower/i })).toHaveCount(0)
  })

  test('an application that fails to load is reported', async ({ page }) => {
    await seedSession(page, { permissions: ['view application'] })
    await mockApi(page, [{ method: 'GET', match: `${EF}/submissions/999`, status: 404, body: failure('Submission not found.') }])
    await page.goto('/embed-form/loan-applications/999')
    await expect(page.getByText('Submission not found.').first()).toBeVisible()
  })
})
