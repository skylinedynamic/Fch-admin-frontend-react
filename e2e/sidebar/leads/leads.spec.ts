import { test, expect, type Page } from '@playwright/test'
import {
  mockApi, ok, paginated, failure, seedSession, expectCall, confirmDelete, cancelDelete,
  selectRow, openActionsMenu, type ApiMock,
  pickPrime,
} from '../../support/helpers'

const COMPLETE = {
  id: 51, contact_person: 'Lena Lead', company_name: 'Lead Works', email: 'lena@example.test', phone_number: '(555) 010-0001',
  lead_type: 'Borrower', status: 'New', country: 'United States', state: 'Texas', city: 'Austin', convert_to: null,
}
const INCOMPLETE = {
  id: 52, contact_person: 'Milo Missing', company_name: 'Half Data LLC', email: 'milo@example.test', phone_number: '',
  lead_type: 'Borrower', status: 'New', country: '', state: '', city: '', convert_to: null,
}
const CONVERTED = {
  id: 53, contact_person: 'Cora Converted', company_name: 'Done Deal', email: 'cora@example.test', phone_number: '(555) 010-0003',
  lead_type: 'Partner', status: 'Won', country: 'United States', state: 'Texas', city: 'Austin', convert_to: 'Partner',
}
const LEADS = [COMPLETE, INCOMPLETE, CONVERTED]
const LIST = '/common/leads/fetch-leads'

async function openList(page: Page, permissions: string[]): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(LEADS) }])
  await page.goto('/leads')
  await expect(page.getByText('Lena Lead')).toBeVisible()
  return api
}

test.describe('Leads list', () => {
  // BUG-003: an empty contact / email / phone showed the word "Null".
  test('empty contact, email and phone show a dash, not "Null"', async ({ page }) => {
    await seedSession(page, { permissions: ['view leads'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([{ id: 61, contact_person: null, company_name: 'Gonzales Mooney LLC', email: '', phone_number: 'null', lead_type: 'Borrower', status: 'New Lead' }]) }])
    await page.goto('/leads')
    const row = page.locator('tr', { hasText: 'Gonzales Mooney LLC' })
    await expect(row).toBeVisible()
    await expect(row.getByText(/^null$/i)).toHaveCount(0)
    // Contact, Email, Phone - and SalesPerson, empty in this row too.
    await expect(row.getByText('—')).toHaveCount(4)
  })

  test('renders leads from the API', async ({ page }) => {
    await openList(page, ['view leads'])
    await expect(page.getByText('Half Data LLC')).toBeVisible()
    await expect(page.getByText('cora@example.test')).toBeVisible()
  })

  test('a converted lead shows a badge instead of the convert button', async ({ page }) => {
    await openList(page, ['view leads'])
    const row = page.locator('tr', { hasText: 'Cora Converted' })
    await expect(row.getByText('Converted as a Partner')).toBeVisible()
    await expect(row.getByRole('button', { name: /convert to/i })).toHaveCount(0)
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page, ['view leads'])
    await page.getByPlaceholder('Search here...').fill('milo')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('milo')
  })

  test('Clear empties the search box', async ({ page }) => {
    await openList(page, ['view leads'])
    await page.getByPlaceholder('Search here...').fill('milo')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(page.getByPlaceholder('Search here...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view leads'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/leads')
    await expect(page.getByText('No leads found')).toBeVisible()
  })

  test('a failed list request is reported', async ({ page }) => {
    await seedSession(page, { permissions: ['view leads'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: failure('Leads are unavailable.') }])
    await page.goto('/leads')
    await expect(page.getByText('Leads are unavailable.').first()).toBeVisible()
  })

  test('clicking a row opens the lead', async ({ page }) => {
    await openList(page, ['view leads'])
    await page.getByText('lena@example.test').click()
    await expect(page).toHaveURL(/\/leads\/51/)
  })

  test('Add Lead needs the create permission', async ({ page }) => {
    await openList(page, ['view leads'])
    await expect(page.getByRole('button', { name: /add lead/i })).toHaveCount(0)
  })

  test('Add Lead opens the create page', async ({ page }) => {
    await openList(page, ['view leads', 'create leads'])
    await page.getByRole('button', { name: /add lead/i }).click()
    await expect(page).toHaveURL(/\/leads\/create/)
  })
})

test.describe('Leads bulk delete', () => {
  test('deletes the selected leads in one call after confirmation', async ({ page }) => {
    const api = await openList(page, ['view leads', 'delete leads'])
    api.add({ method: 'POST', match: '/common/leads/multiple-delete', body: ok(null) })
    await selectRow(page, 0)
    await selectRow(page, 1)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Leads deleted successfully')).toBeVisible()
    // One call for every selected lead (docs/handoff/2026-10-13-one-lead-delete-api.md).
    expect(api.find('POST', '/common/leads/multiple-delete').map((c) => c.json)).toEqual([{ ids: [51, 52] }])
  })

  test('closing the confirmation cancels the delete', async ({ page }) => {
    const api = await openList(page, ['view leads', 'delete leads'])
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await cancelDelete(page)
    expect(api.find('POST', '/common/leads/multiple-delete')).toHaveLength(0)
  })

  test('a failed delete shows the server message', async ({ page }) => {
    const api = await openList(page, ['view leads', 'delete leads'])
    api.add({ method: 'POST', match: '/common/leads/multiple-delete', status: 409, body: failure('Lead has already been converted.') })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Lead has already been converted.').first()).toBeVisible()
  })

  test('row selection is hidden without the delete permission', async ({ page }) => {
    await openList(page, ['view leads'])
    await expect(page.locator('.p-datatable-tbody .p-checkbox')).toHaveCount(0)
  })
})

test.describe('Lead conversion', () => {
  test('a complete lead opens the convert dialog', async ({ page }) => {
    await openList(page, ['view leads'])
    await page.locator('tr', { hasText: 'Lena Lead' }).getByRole('button', { name: /convert to borrower/i }).click()
    await expect(page.getByText('Convert Lead to Borrower')).toBeVisible()
  })

  test('a lead with missing contact info is asked to complete it first', async ({ page }) => {
    const api = await openList(page, ['view leads'])
    await page.locator('tr', { hasText: 'Milo Missing' }).getByRole('button', { name: /convert to borrower/i }).click()
    await expect(page.getByRole('button', { name: 'Save & Continue' })).toBeVisible()
    await expect(page.locator('.modal.show', { hasText: 'Convert Lead to Borrower' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('button', { name: 'Save & Continue' })).toBeHidden()
    expect(api.find('POST', '/convert')).toHaveLength(0)
  })

  test('missing-info server errors keep the dialog open', async ({ page }) => {
    const api = await openList(page, ['view leads'])
    api.add({
      method: 'POST', match: '/common/leads/52/contact-info', status: 422,
      body: failure('Invalid', { phone_number: ['The phone number field is required.'] }),
    })
    await page.locator('tr', { hasText: 'Milo Missing' }).getByRole('button', { name: /convert to borrower/i }).click()
    await page.getByRole('button', { name: 'Save & Continue' }).click()
    await expectCall(api, 'POST', '/common/leads/52/contact-info')
    await expect(page.getByRole('button', { name: 'Save & Continue' })).toBeVisible()
  })
})

test.describe('Lead create', () => {
  const CREATE = '/common/leads/details'

  async function openCreate(page: Page) {
    await seedSession(page, { permissions: ['view leads', 'create leads'] })
    const api = await mockApi(page)
    await page.goto('/leads/create')
    await expect(page.locator('input[name="company_name"]')).toBeVisible()
    // Contact Person is required (SCRUM-170); the form refuses to post without it.
    await page.locator('input[name="contact_person"]').fill('Jane Doe')
    return api
  }

  test('Contact Person is required before anything is posted', async ({ page }) => {
    const api = await openCreate(page)
    await page.locator('input[name="contact_person"]').fill('')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('Contact Person is required.')).toBeVisible()
    await expect(page.locator('input[name="contact_person"]')).toHaveClass(/is-invalid/)
    expect(api.find('POST', CREATE)).toHaveLength(0)
  })

  test('server validation errors are shown inline', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: CREATE, status: 422,
      body: failure('Invalid', { company_name: ['The company name field is required.'] }),
    })
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('The company name field is required.')).toBeVisible()
    await expect(page.locator('input[name="company_name"]')).toHaveClass(/is-invalid/)
    await expect(page).toHaveURL(/\/leads\/create/)
  })

  // What the real API answers when only the company name is filled in.
  test('the fields the API requires are reported next to each of them', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: CREATE, status: 422,
      body: failure('Probability is required.', { probability: 'Probability is required.', lead_type: 'Lead Type is required.', status: 'Status is required.' } as never),
    })
    await page.locator('input[name="company_name"]').fill('Fresh Lead Co')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('Probability is required.').first()).toBeVisible()
    await expect(page.getByText('Status is required.').first()).toBeVisible()
    await expect(page).toHaveURL(/\/leads\/create/)
  })

  test('a general failure is toasted', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, status: 500, body: failure('Lead pipeline is locked.') })
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('Lead pipeline is locked.').first()).toBeVisible()
  })

  test('lead details are posted and the contact-info tab opens for the new lead', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, body: ok({ id: 77 }) })
    api.add({ method: 'GET', match: '/common/leads/77', body: ok({ ...COMPLETE, id: 77, company_name: 'Fresh Lead Co' }) })
    await page.locator('input[name="company_name"]').fill('Fresh Lead Co')
    await page.locator('input[name="domain"]').fill('freshlead.test')
    // The real API also requires a probability and a status; a lead saved
    // without them is refused, so the form is filled the way it has to be.
    await pickPrime(page, page.locator('.p-dropdown', { hasText: 'Select probability' }), '0%')
    await pickPrime(page, page.locator('.p-dropdown', { hasText: 'Select status' }), 'New Lead')
    await page.getByRole('button', { name: /save/i }).click()
    const call = await expectCall(api, 'POST', CREATE)
    expect(call.json).toMatchObject({ company_name: 'Fresh Lead Co', contact_person: 'Jane Doe', domain: 'freshlead.test' })
    expect(call.json.probability).toBeTruthy()
    expect(call.json.status).toBeTruthy()
    await expect(page.getByText('Lead Details Completed successfully')).toBeVisible()
    await expect(page).toHaveURL(/\/leads\/77\?tab=contactInfo/)
  })

  test('the create page is blocked without the create permission', async ({ page }) => {
    await seedSession(page, { permissions: ['view leads'] })
    await mockApi(page)
    await page.goto('/leads/create')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Lead edit', () => {
  async function openEdit(page: Page, lead: Record<string, unknown> = COMPLETE, permissions = ['view leads', 'update leads']) {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'GET', match: /\/common\/leads\/\d+$/, body: ok(lead) }])
    await page.goto(`/leads/${lead.id}`)
    await expect(page.locator('input[name="company_name"]')).toHaveValue(String(lead.company_name))
    return api
  }

  test('Update on the lead details tab posts to the details endpoint', async ({ page }) => {
    const api = await openEdit(page)
    api.add({ method: 'POST', match: '/common/leads/51/details', body: ok(COMPLETE) })
    await page.locator('input[name="company_name"]').fill('Lead Works Renamed')
    await page.getByRole('button', { name: /update/i }).click()
    const call = await expectCall(api, 'POST', '/common/leads/51/details')
    expect(call.json).toMatchObject({ company_name: 'Lead Works Renamed' })
    await expect(page.getByText('Lead Details updated successfully')).toBeVisible()
  })

  test('Update on the contact info tab posts to the contact-info endpoint', async ({ page }) => {
    const api = await openEdit(page)
    api.add({ method: 'POST', match: '/common/leads/51/contact-info', body: ok(COMPLETE) })
    await page.goto('/leads/51?tab=contactInfo')
    await expect(page.locator('input[name="contact_person"]')).toHaveValue('Lena Lead')
    await page.locator('input[name="contact_person"]').fill('Lena L. Lead')
    await page.getByRole('button', { name: /update/i }).click()
    const call = await expectCall(api, 'POST', '/common/leads/51/contact-info')
    expect(call.json).toMatchObject({ contact_person: 'Lena L. Lead', email: 'lena@example.test' })
    await expect(page.getByText('Lead contact information updated successfully')).toBeVisible()
  })

  test('a converted lead cannot be edited', async ({ page }) => {
    await openEdit(page, CONVERTED)
    await expect(page.locator('button.btn-primary.w-lg')).toHaveCount(0)
  })

  test('Update is hidden for view-only users', async ({ page }) => {
    await openEdit(page, COMPLETE, ['view leads'])
    await expect(page.locator('button.btn-primary.w-lg')).toHaveCount(0)
  })
})
