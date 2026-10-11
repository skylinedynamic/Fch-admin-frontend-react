import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from './helpers'

const RA = '/common/request-application'

test.describe('Pre-qualification applications', () => {
  const APPS = [
    { id: 301, full_name: 'Pia Prequal', business_name: 'Prequal Co', funding_type: 'Term Loan', requested_amount: '$50,000', date: '2026-03-01', status: 'Pending' },
    { id: 302, full_name: 'Quinn Qualified', business_name: 'Qualified LLC', funding_type: 'Line of Credit', requested_amount: '$120,000', date: '2026-03-04', status: 'Approved' },
  ]
  const LIST = new RegExp(`${RA}/pre-qualification$`)

  async function openList(page: Page, permissions = ['view pre qualification']): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(APPS) }])
    await page.goto('/intake-review/pre-qualification')
    await expect(page.getByText('Pia Prequal')).toBeVisible()
    return api
  }

  test('lists applications with status', async ({ page }) => {
    await openList(page)
    await expect(page.locator('tr', { hasText: 'Quinn Qualified' }).getByText('Approved')).toBeVisible()
    await expect(page.getByText('Prequal Co')).toBeVisible()
  })

  test('search is sent to the API and Clear resets it', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search here...').fill('quinn')
    await page.locator('button', { hasText: 'Filters' }).click()
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('quinn')
    await page.locator('button', { hasText: 'Clear' }).click()
    await expect(page.getByPlaceholder('Search here...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view pre qualification'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/intake-review/pre-qualification')
    await expect(page.getByText('No applications found')).toBeVisible()
  })

  test('clicking a row opens the application', async ({ page }) => {
    await openList(page)
    await page.getByText('Prequal Co').click()
    await expect(page).toHaveURL(/\/intake-review\/pre-qualification\/301$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/intake-review/pre-qualification')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Pre-qualification details - status update', () => {
  const DETAIL = {
    id: 301, full_name: 'Pia Prequal', first_name: 'Pia', last_name: 'Prequal', email: 'pia@example.test',
    business_name: 'Prequal Co', funding_type: 'Term Loan', requested_amount: 50000, status: '', status_note: '',
  }
  const UPDATE = `${RA}/pre-qualification/status-update`

  async function open(page: Page, permissions = ['view pre qualification', 'update pre qualification']): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'GET', match: `${RA}/pre-qualification/301`, body: ok(DETAIL) }])
    await page.goto('/intake-review/pre-qualification/301')
    await expect(page.getByPlaceholder('Add notes...')).toBeVisible()
    return api
  }

  test('status and notes are required before the confirmation opens', async ({ page }) => {
    const api = await open(page)
    await page.getByRole('button', { name: 'Update Status' }).click()
    await expect(page.getByText('Select a status before updating.')).toBeVisible()
    await expect(page.getByPlaceholder('Add notes...')).toHaveClass(/is-invalid/)
    await expect(page.locator('.modal.show')).toHaveCount(0)
    expect(api.find('POST', UPDATE)).toHaveLength(0)
  })

  test('the note counter tracks what is typed', async ({ page }) => {
    await open(page)
    await page.getByPlaceholder('Add notes...').fill('Reviewed')
    await expect(page.getByText(/^8 \/ \d+ characters$/)).toBeVisible()
  })

  test('the update button is hidden without the update permission', async ({ page }) => {
    await seedSession(page, { permissions: ['view pre qualification'] })
    await mockApi(page, [{ method: 'GET', match: `${RA}/pre-qualification/301`, body: ok({ ...DETAIL, status: 'Pending' }) }])
    await page.goto('/intake-review/pre-qualification/301')
    await expect(page.getByRole('link', { name: /back/i }).or(page.locator('button', { hasText: 'Back' })).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Update Status' })).toHaveCount(0)
  })

  test('an application that fails to load is reported', async ({ page }) => {
    await seedSession(page, { permissions: ['view pre qualification'] })
    await mockApi(page, [{ method: 'GET', match: `${RA}/pre-qualification/999`, status: 404, body: failure('Not found') }])
    await page.goto('/intake-review/pre-qualification/999')
    await expect(page.getByText('Failed to load application details').first()).toBeVisible()
  })
})

test.describe('Funding applications', () => {
  const APPS = [
    { id: 401, full_name: 'Fran Funding', application_no: 'APP-0001', industry_type: 'Retail', entity_type: 'LLC', purpose_of_funds: 'Inventory', requested_amount: '$80,000', date: '2026-03-02', status: 'Submitted' },
    { id: 402, full_name: 'Gus Growth', application_no: 'APP-0002', industry_type: 'Tech', entity_type: 'C-Corp', purpose_of_funds: 'Hiring', requested_amount: '$300,000', date: '2026-03-05', status: 'Approved' },
  ]
  const LIST = new RegExp(`${RA}/funding-application$`)

  async function openList(page: Page): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view funding application'] })
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(APPS) }])
    await page.goto('/intake-review/funding-application')
    await expect(page.getByText('Fran Funding')).toBeVisible()
    return api
  }

  test('lists applications', async ({ page }) => {
    await openList(page)
    await expect(page.getByText('Gus Growth')).toBeVisible()
    await expect(page.getByText('Inventory')).toBeVisible()
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search here...').fill('gus')
    await page.getByPlaceholder('Search here...').press('Enter')
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('gus')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view funding application'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/intake-review/funding-application')
    await expect(page.getByText('No applications found')).toBeVisible()
  })

  test('clicking a row opens the application', async ({ page }) => {
    await openList(page)
    await page.getByText('Inventory').click()
    await expect(page).toHaveURL(/\/intake-review\/funding-application\/401$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/intake-review/funding-application')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Funding requests', () => {
  const REQS = [
    { id: 601, borrower: { first_name: 'Rhea', last_name: 'Requester' }, partner: { full_name: 'Acme Funding' }, funding_sequence: { name: 'SBA 7(a)' }, funding_type: 'SBA Loan', requested_amount: 150000, lender_names: 'First Capital', status: 'Pending', application_status: 'Submitted' },
  ]
  const LIST = /\/common\/funding-request$/

  async function openList(page: Page): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view funding request'] })
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(REQS) }])
    await page.goto('/intake-review/funding-request')
    await expect(page.getByText('Rhea Requester')).toBeVisible()
    return api
  }

  test('lists requests with borrower, partner, sequence and lender', async ({ page }) => {
    await openList(page)
    const row = page.locator('tr', { hasText: 'Rhea Requester' })
    await expect(row.getByText('Acme Funding')).toBeVisible()
    await expect(row.getByText('SBA 7(a)')).toBeVisible()
    await expect(row.getByText('First Capital')).toBeVisible()
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search borrower or partner name...').fill('rhea')
    await page.getByPlaceholder('Search borrower or partner name...').press('Enter')
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('rhea')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view funding request'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/intake-review/funding-request')
    await expect(page.getByText('No funding requests found')).toBeVisible()
  })

  test('clicking a row opens the request', async ({ page }) => {
    await openList(page)
    await page.getByText('Acme Funding').click()
    await expect(page).toHaveURL(/\/intake-review\/funding-request\/601$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/intake-review/funding-request')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Change requests', () => {
  const ROWS = [
    { id: 701, borrower_business_name: 'Smithfield Bakery LLC', borrower_first_name: 'Johnathan', borrower_last_name: 'Smithfield', field_name: 'business_address', old_value: '1 Old Rd', new_value: '2 New Ave', status: 'Pending', note: null, created_at: '2026-03-03' },
    { id: 702, borrower_business_name: 'Quill Ink Co', borrower_first_name: 'Mara', borrower_last_name: 'Quill', field_name: 'phone_number', old_value: '111', new_value: '222', status: 'Approved', note: 'Verified by phone', created_at: '2026-03-01' },
  ]
  const LIST = /\/admin\/change-requests$/
  const PERMS = ['view change requests', 'update change requests']

  async function open(page: Page, user: Record<string, unknown> = { permissions: PERMS }): Promise<ApiMock> {
    await seedSession(page, user)
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(ROWS) }])
    await page.goto('/intake-review/change-requests')
    await expect(page.getByText('Smithfield Bakery LLC')).toBeVisible()
    return api
  }
  const modal = (page: Page) => page.locator('.modal', { hasText: 'Review Change Request' })

  test('lists requests with the field, old and new values', async ({ page }) => {
    await open(page)
    const row = page.locator('tr', { hasText: 'Smithfield Bakery LLC' })
    await expect(row.getByText('business address')).toBeVisible()
    await expect(row.getByText('1 Old Rd')).toBeVisible()
    await expect(row.getByText('2 New Ave')).toBeVisible()
  })

  test('search is sent to the API and Clear resets it', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Search borrower name...').fill('quill')
    await page.locator('button.btn-warning', { hasText: 'Filter' }).click()
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('quill')
    await page.locator('button', { hasText: 'Clear' }).click()
    await expect(page.getByPlaceholder('Search borrower name...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: PERMS })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/intake-review/change-requests')
    await expect(page.getByText('No change requests found.')).toBeVisible()
  })

  test('approving a pending request PATCHes status=Approved', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PATCH', match: '/admin/change-requests/701', body: ok(null, 'Change request approved.') })
    await page.getByText('Smithfield Bakery LLC').click()
    await modal(page).getByPlaceholder('Optional note…').fill('Looks right')
    await modal(page).getByRole('button', { name: /confirm/i }).click()
    const call = await expectCall(api, 'PATCH', '/admin/change-requests/701')
    expect(call.json).toEqual({ status: 'Approved', note: 'Looks right' })
    await expect(page.getByText('Change request approved.')).toBeVisible()
  })

  test('rejecting requires a note before Confirm is enabled', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PATCH', match: '/admin/change-requests/701', body: ok(null, 'Change request rejected.') })
    await page.getByText('Smithfield Bakery LLC').click()
    await modal(page).getByRole('button', { name: 'Rejected' }).click()
    await expect(modal(page).getByText('A note is required when rejecting.')).toBeVisible()
    await expect(modal(page).getByRole('button', { name: /confirm/i })).toBeDisabled()

    await modal(page).getByPlaceholder('Please provide a reason for rejection…').fill('Address does not match records')
    await expect(modal(page).getByText('A note is required when rejecting.')).toHaveCount(0)
    await modal(page).getByRole('button', { name: /confirm/i }).click()
    const call = await expectCall(api, 'PATCH', '/admin/change-requests/701')
    expect(call.json).toEqual({ status: 'Rejected', note: 'Address does not match records' })
  })

  test('a whitespace-only rejection note does not enable Confirm', async ({ page }) => {
    await open(page)
    await page.getByText('Smithfield Bakery LLC').click()
    await modal(page).getByRole('button', { name: 'Rejected' }).click()
    await modal(page).getByPlaceholder('Please provide a reason for rejection…').fill('   ')
    await expect(modal(page).getByRole('button', { name: /confirm/i })).toBeDisabled()
  })

  test('Cancel closes the review without saving', async ({ page }) => {
    const api = await open(page)
    await page.getByText('Smithfield Bakery LLC').click()
    await modal(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(modal(page)).toHaveCount(0)
    expect(api.find('PATCH', '/admin/change-requests/')).toHaveLength(0)
  })

  test('an already-reviewed request is read-only', async ({ page }) => {
    await open(page)
    await page.getByText('Quill Ink Co').click()
    await expect(modal(page).getByRole('button', { name: /confirm/i })).toHaveCount(0)
    await expect(modal(page).locator('textarea')).toBeDisabled()
    await expect(modal(page).locator('textarea')).toHaveValue('Verified by phone')
    await expect(modal(page).getByRole('button', { name: 'Close' }).last()).toBeVisible()
  })

  test('a status:false response is reported and the review stays open', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PATCH', match: '/admin/change-requests/701', body: failure('Request was already reviewed.') })
    await page.getByText('Smithfield Bakery LLC').click()
    await modal(page).getByRole('button', { name: /confirm/i }).click()
    await expect(page.getByText('Request was already reviewed.').first()).toBeVisible()
    await expect(modal(page)).toBeVisible()
  })

  test('a server error is reported', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PATCH', match: '/admin/change-requests/701', status: 500, body: failure('boom') })
    await page.getByText('Smithfield Bakery LLC').click()
    await modal(page).getByRole('button', { name: /confirm/i }).click()
    await expect(page.getByText('Something went wrong')).toBeVisible()
  })

  test('a user without the update permission cannot decide', async ({ page }) => {
    await open(page, { permissions: ['view change requests'] })
    await page.getByText('Smithfield Bakery LLC').click()
    await expect(modal(page).getByText('You do not have permission to approve or reject this request.')).toBeVisible()
    await expect(modal(page).getByRole('button', { name: /confirm/i })).toHaveCount(0)
  })

  test('a non-host user with the permission still cannot decide', async ({ page }) => {
    await open(page, { permissions: PERMS, is_host: 0, partner_id: 3 })
    await page.getByText('Smithfield Bakery LLC').click()
    await expect(modal(page).getByText('You do not have permission to approve or reject this request.')).toBeVisible()
  })
})

test.describe('Credit profile requests', () => {
  const ROWS = [
    { id: 801, first_name: 'Cy', last_name: 'Credit', email: 'cy@example.test', phone: '(555) 800-0001', ssn: '123-45-6789', created_at: '2026-03-06', request_status: 'pending', borrower: { business_name: 'Credit Works' } },
  ]
  const LIST = /\/admin\/credit-profile-requests$/

  async function open(page: Page): Promise<ApiMock> {
    await seedSession(page)
    // This endpoint returns a raw Laravel paginator inside data: { data: { data: [...], total } }.
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: ok({ data: ROWS, total: ROWS.length }) }])
    await page.goto('/intake-review/credit-profile-requests')
    await expect(page.getByText('cy@example.test')).toBeVisible()
    return api
  }

  test('lists requests with company and status', async ({ page }) => {
    await open(page)
    await expect(page.getByText('Credit Works')).toBeVisible()
    await expect(page.locator('tbody').getByText('Pending')).toBeVisible()
  })

  test('masks the SSN down to its last four digits', async ({ page }) => {
    await open(page)
    await expect(page.locator('tbody').getByText('***-**-6789')).toBeVisible()
    await expect(page.locator('tbody')).not.toContainText(/\d{3}-\d{2}-\d{4}/)
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await open(page)
    const box = page.getByPlaceholder(/Search applicant name/)
    await box.fill('cy')
    await box.press('Enter')
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('cy')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page)
    await mockApi(page, [{ method: 'POST', match: LIST, body: ok({ data: [], total: 0 }) }])
    await page.goto('/intake-review/credit-profile-requests')
    await expect(page.getByText('No credit profile requests found.')).toBeVisible()
  })

  test('clicking a row opens the request', async ({ page }) => {
    await open(page)
    await page.getByText('cy@example.test').click()
    await expect(page).toHaveURL(/\/intake-review\/credit-profile-requests\/801$/)
  })

  test('non-host users cannot reach credit profile requests', async ({ page }) => {
    await seedSession(page, { is_host: 0, partner_id: 3 })
    await mockApi(page)
    await page.goto('/intake-review/credit-profile-requests')
    await expect(page).not.toHaveURL(/credit-profile-requests/)
  })
})
