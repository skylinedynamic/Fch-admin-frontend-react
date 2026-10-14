import { test, expect, type Page } from '@playwright/test'
import {
  mockApi, ok, paginated, failure, seedSession, expectCall, confirmDelete, cancelDelete,
  selectRow, openActionsMenu, type ApiMock,
} from '../../support/helpers'

const CONTACTS = [
  { id: 31, full_name: 'Carla Contact', first_name: 'Carla', last_name: 'Contact', company_name: 'Contact Co', mobile_number: '(555) 111-2222', email: 'carla@example.test', address: '1 Main St', is_referral_partner: true },
  { id: 32, full_name: 'Dan Dialer', first_name: 'Dan', last_name: 'Dialer', company_name: 'Dialer Inc', mobile_number: '(555) 333-4444', email: 'dan@example.test', address: '2 Side St', is_referral_partner: false },
]
const LIST = '/common/contacts/fetch-contacts'

async function openList(page: Page, permissions: string[]): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(CONTACTS) }])
  await page.goto('/contacts')
  await expect(page.getByText('Carla Contact')).toBeVisible()
  return api
}

test.describe('Contacts list', () => {
  test('renders contacts and flags referral partners', async ({ page }) => {
    await openList(page, ['view contacts'])
    await expect(page.getByText('Dan Dialer')).toBeVisible()
    await expect(page.getByText('carla@example.test')).toBeVisible()
    await expect(page.locator('tr', { hasText: 'Carla Contact' }).getByText('Referral Partner')).toBeVisible()
    await expect(page.locator('tr', { hasText: 'Dan Dialer' }).getByText('Referral Partner')).toHaveCount(0)
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page, ['view contacts'])
    await page.getByPlaceholder('Search here...').fill('dan')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('dan')
  })

  test('Clear empties the search box', async ({ page }) => {
    await openList(page, ['view contacts'])
    await page.getByPlaceholder('Search here...').fill('dan')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(page.getByPlaceholder('Search here...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view contacts'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/contacts')
    await expect(page.getByText('No contacts found')).toBeVisible()
  })

  test('clicking a row opens the contact', async ({ page }) => {
    await openList(page, ['view contacts'])
    await page.getByText('carla@example.test').click()
    await expect(page).toHaveURL(/\/contacts\/31$/)
  })

  test('Add Contact needs the create permission', async ({ page }) => {
    await openList(page, ['view contacts'])
    await expect(page.getByRole('button', { name: /add contact/i })).toHaveCount(0)
  })

  test('Add Contact opens the create page', async ({ page }) => {
    await openList(page, ['view contacts', 'create contacts'])
    await page.getByRole('button', { name: /add contact/i }).click()
    await expect(page).toHaveURL(/\/contacts\/create/)
  })

  test('row selection is hidden without the delete permission', async ({ page }) => {
    await openList(page, ['view contacts'])
    await expect(page.locator('.p-datatable-tbody .p-checkbox')).toHaveCount(0)
  })
})

test.describe('Contacts bulk delete', () => {
  const DELETE = '/common/contacts/multiple-delete'

  test('deletes the selected contacts after confirmation', async ({ page }) => {
    const api = await openList(page, ['view contacts', 'delete contacts'])
    api.add({ method: 'POST', match: DELETE, body: ok(null, 'Contact(s) deleted successfully.') })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    const call = await expectCall(api, 'POST', DELETE)
    expect(call.json).toEqual({ ids: [31] })
    await expect(page.getByText('Contact(s) deleted successfully.')).toBeVisible()
  })

  test('closing the confirmation cancels the delete', async ({ page }) => {
    const api = await openList(page, ['view contacts', 'delete contacts'])
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await cancelDelete(page)
    expect(api.find('POST', DELETE)).toHaveLength(0)
  })

  test('a status:false response is reported as a failure', async ({ page }) => {
    const api = await openList(page, ['view contacts', 'delete contacts'])
    api.add({ method: 'POST', match: DELETE, body: failure('Contact is linked to a lead.') })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Contact is linked to a lead.')).toBeVisible()
  })
})

test.describe('Contact create - validation', () => {
  const CREATE = /\/common\/contacts$/

  async function openCreate(page: Page) {
    await seedSession(page, { permissions: ['view contacts', 'create contacts'] })
    const api = await mockApi(page)
    await page.goto('/contacts/create')
    await expect(page.getByPlaceholder('Enter full name')).toBeVisible()
    return api
  }

  const name = (page: Page) => page.locator('input[name="full_name"]')
  const email = (page: Page) => page.locator('input[name="email"]')
  const mobile = (page: Page) => page.locator('input[name="mobile_number"]')
  const save = (page: Page) => page.getByRole('button', { name: /save/i })

  test('required fields are enforced before any request is made', async ({ page }) => {
    const api = await openCreate(page)
    await save(page).click()
    await expect(page.getByText('Full name is required')).toBeVisible()
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Mobile number is required')).toBeVisible()
    await expect(name(page)).toHaveClass(/is-invalid/)
    expect(api.find('POST', CREATE)).toHaveLength(0)
  })

  test('a whitespace-only name is treated as empty', async ({ page }) => {
    await openCreate(page)
    await name(page).fill('   ')
    await save(page).click()
    await expect(page.getByText('Full name is required')).toBeVisible()
  })

  test('a malformed email is rejected', async ({ page }) => {
    await openCreate(page)
    await name(page).fill('Nora New')
    await email(page).fill('nora@invalid')
    await mobile(page).fill('5551234567')
    await save(page).click()
    await expect(page.getByText('Please enter a valid email address')).toBeVisible()
  })

  test('an incomplete mobile number is rejected', async ({ page }) => {
    await openCreate(page)
    await name(page).fill('Nora New')
    await email(page).fill('nora@example.test')
    await mobile(page).fill('55512')
    await save(page).click()
    await expect(page.getByText(/Please enter a valid mobile number/)).toBeVisible()
  })

  test('the mobile number is formatted while typing', async ({ page }) => {
    await openCreate(page)
    await mobile(page).fill('5551234567')
    await expect(mobile(page)).toHaveValue('(555) 123-4567')
  })

  test('a valid contact is posted with the name split into first/last', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, body: ok({ id: 40 }) })
    await name(page).fill('Nora New Person')
    await email(page).fill('nora@example.test')
    await mobile(page).fill('5551234567')
    await save(page).click()
    const call = await expectCall(api, 'POST', CREATE)
    expect(call.json).toMatchObject({
      full_name: 'Nora New Person', first_name: 'Nora', last_name: 'New Person',
      email: 'nora@example.test', mobile_number: '(555) 123-4567',
    })
    await expect(page.getByText('Contact created successfully')).toBeVisible()
    await expect(page).toHaveURL(/\/contacts$/)
  })

  test('the referral-partner switch is included in the payload', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, body: ok({ id: 41 }) })
    await name(page).fill('Rita Referrer')
    await email(page).fill('rita@example.test')
    await mobile(page).fill('5551234567')
    await page.locator('#is_referral_partner').check()
    await save(page).click()
    const call = await expectCall(api, 'POST', CREATE)
    expect(Boolean(call.json.is_referral_partner)).toBe(true)
  })

  test('server validation errors are shown inline (first_name maps to full name)', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: CREATE, status: 422,
      body: failure('Invalid', { first_name: ['The first name is too long.'], email: ['The email has already been taken.'] }),
    })
    await name(page).fill('Nora New')
    await email(page).fill('nora@example.test')
    await mobile(page).fill('5551234567')
    await save(page).click()
    await expect(page.getByText('The first name is too long.')).toBeVisible()
    await expect(page.getByText('The email has already been taken.')).toBeVisible()
    await expect(page).toHaveURL(/\/contacts\/create/)
  })

  test('a general failure is toasted', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, status: 500, body: failure('Contact storage is offline.') })
    await name(page).fill('Nora New')
    await email(page).fill('nora@example.test')
    await mobile(page).fill('5551234567')
    await save(page).click()
    await expect(page.getByText('Contact storage is offline.').first()).toBeVisible()
  })

  test('Back returns to the list', async ({ page }) => {
    await openCreate(page)
    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL(/\/contacts$/)
  })
})

test.describe('Contact edit', () => {
  async function openEdit(page: Page, permissions = ['view contacts', 'update contacts']) {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'GET', match: /\/common\/contacts\/31$/, body: ok(CONTACTS[0]) }])
    await page.goto('/contacts/31')
    await expect(page.locator('input[name="full_name"]')).toHaveValue('Carla Contact')
    return api
  }

  test('loads the contact into the form', async ({ page }) => {
    await openEdit(page)
    await expect(page.locator('input[name="email"]')).toHaveValue('carla@example.test')
    await expect(page.locator('input[name="company_name"]')).toHaveValue('Contact Co')
    await expect(page.locator('#is_referral_partner')).toBeChecked()
  })

  test('Update PUTs the changes', async ({ page }) => {
    const api = await openEdit(page)
    api.add({ method: 'PUT', match: /\/common\/contacts\/31$/, body: ok(CONTACTS[0]) })
    await page.locator('input[name="company_name"]').fill('Renamed Co')
    await page.getByRole('button', { name: /update/i }).click()
    const call = await expectCall(api, 'PUT', /\/common\/contacts\/31$/)
    expect(call.json).toMatchObject({ company_name: 'Renamed Co', first_name: 'Carla', last_name: 'Contact' })
    await expect(page.getByText('Contact updated successfully')).toBeVisible()
  })

  test('validation also runs on update', async ({ page }) => {
    const api = await openEdit(page)
    await page.locator('input[name="email"]').fill('')
    await page.getByRole('button', { name: /update/i }).click()
    await expect(page.getByText('Email is required')).toBeVisible()
    expect(api.find('PUT', /\/common\/contacts\/31$/)).toHaveLength(0)
  })

  test('Update is hidden for view-only users', async ({ page }) => {
    await openEdit(page, ['view contacts'])
    await expect(page.locator('button.btn-primary.w-lg')).toHaveCount(0)
  })
})
