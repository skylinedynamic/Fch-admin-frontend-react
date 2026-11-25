import { test, expect, type Page } from '@playwright/test'
import {
  mockApi, ok, paginated, failure, seedSession, expectCall, confirmDelete, cancelDelete, pickPrime,
  type ApiMock,
} from '../../support/helpers'

const USERS = [
  { id: 11, name: 'Alice Admin', email: 'alice@example.test', phone_number: '(111) 111-1111', role_name: 'Manager', status: 'active', entity_type: 'Employee', end_date: null },
  { id: 12, name: 'Bob Builder', email: 'bob@example.test', phone_number: '(222) 222-2222', role_name: 'Agent', status: 'inactive', entity_type: 'Employee', end_date: null },
]
const ROLES = [{ id: 1, name: 'Manager' }, { id: 2, name: 'Agent' }]

async function openList(page: Page, permissions: string[]): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, [
    { method: 'POST', match: '/common/users/fetch-users', body: paginated(USERS) },
    { method: 'POST', match: '/common/roles/fetch-roles', body: ok(ROLES) },
  ])
  await page.goto('/users')
  await expect(page.getByRole('link', { name: 'Alice Admin' })).toBeVisible()
  return api
}

test.describe('Users list', () => {
  test('renders rows from the API with status badges', async ({ page }) => {
    await openList(page, ['view users'])
    await expect(page.getByRole('link', { name: 'Bob Builder' })).toBeVisible()
    await expect(page.getByText('alice@example.test')).toBeVisible()
    await expect(page.getByText('Active', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Inactive', { exact: true }).first()).toBeVisible()
  })

  test('search sends the term in the fetch payload', async ({ page }) => {
    const api = await openList(page, ['view users'])
    const before = api.find('POST', '/common/users/fetch-users').length
    await page.getByPlaceholder('Search here...').fill('alice')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => api.find('POST', '/common/users/fetch-users').length).toBeGreaterThan(before)
    const last = api.find('POST', '/common/users/fetch-users').at(-1)!
    expect(last.json.search).toBe('alice')
  })

  test('pressing Enter in the search box applies the filter', async ({ page }) => {
    const api = await openList(page, ['view users'])
    await page.getByPlaceholder('Search here...').fill('bob')
    await page.getByPlaceholder('Search here...').press('Enter')
    await expect.poll(() => api.find('POST', '/common/users/fetch-users').at(-1)?.json.search).toBe('bob')
  })

  test('Clear resets the search term', async ({ page }) => {
    const api = await openList(page, ['view users'])
    await page.getByPlaceholder('Search here...').fill('bob')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => api.find('POST', '/common/users/fetch-users').at(-1)?.json.search).toBe('bob')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(page.getByPlaceholder('Search here...')).toHaveValue('')
    await expect.poll(() => api.find('POST', '/common/users/fetch-users').at(-1)?.json.search).toBe('')
  })

  test('status filter is sent in the payload', async ({ page }) => {
    const api = await openList(page, ['view users'])
    await pickPrime(page, page.locator('.employee-filter-dropdown').first(), 'Inactive')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => api.find('POST', '/common/users/fetch-users').at(-1)?.json.status).toBe('inactive')
  })

  test('shows the empty message when no users are returned', async ({ page }) => {
    await seedSession(page, { permissions: ['view users'] })
    await mockApi(page, [{ method: 'POST', match: '/common/users/fetch-users', body: paginated([]) }])
    await page.goto('/users')
    await expect(page.getByText('No Users found')).toBeVisible()
  })

  test('clicking a user name opens the details page', async ({ page }) => {
    await openList(page, ['view users'])
    await page.getByRole('link', { name: 'Alice Admin' }).click()
    await expect(page).toHaveURL(/\/user-details\/11/)
  })

  test('Add User is hidden without the create permission', async ({ page }) => {
    await openList(page, ['view users'])
    await expect(page.getByRole('button', { name: /add user/i })).toHaveCount(0)
  })

  test('Add User opens the create page for a host', async ({ page }) => {
    await openList(page, ['view users', 'create users'])
    await page.getByRole('button', { name: /add user/i }).click()
    await expect(page).toHaveURL(/\/users\/create/)
  })

  test('selection checkboxes are hidden without the delete permission', async ({ page }) => {
    await openList(page, ['view users'])
    await expect(page.locator('.p-datatable .p-checkbox')).toHaveCount(0)
  })
})

test.describe('Users bulk delete', () => {
  test('selecting a row swaps Add User for the Actions menu, then deletes after confirming', async ({ page }) => {
    const api = await openList(page, ['view users', 'create users', 'delete users'])
    api.add({ method: 'POST', match: '/common/users/multiple-delete', body: ok(null, 'Deleted') })

    await page.locator('.p-datatable-tbody .p-checkbox').first().click()
    await expect(page.getByRole('button', { name: /add user/i })).toHaveCount(0)
    await page.locator('#primaryActionToggleBtn').click()
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)

    const call = await expectCall(api, 'POST', '/common/users/multiple-delete')
    expect(call.json).toEqual({ ids: [11] })
    await expect(page.getByText('Users deleted successfully')).toBeVisible()
  })

  test('closing the confirmation does not delete', async ({ page }) => {
    const api = await openList(page, ['view users', 'delete users'])
    await page.locator('.p-datatable-tbody .p-checkbox').first().click()
    await page.locator('#primaryActionToggleBtn').click()
    await page.getByRole('button', { name: /delete selected/i }).click()
    await cancelDelete(page)
    expect(api.find('POST', '/common/users/multiple-delete')).toHaveLength(0)
  })

  test('shows the server message when delete fails', async ({ page }) => {
    const api = await openList(page, ['view users', 'delete users'])
    api.add({ method: 'POST', match: '/common/users/multiple-delete', status: 422, body: failure('Cannot delete a user with open tasks.') })
    await page.locator('.p-datatable-tbody .p-checkbox').first().click()
    await page.locator('#primaryActionToggleBtn').click()
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Cannot delete a user with open tasks.')).toBeVisible()
  })
})

test.describe('User details - edit', () => {
  const DETAIL = { id: 11, name: 'Alice Admin', email: 'alice@example.test', phone_number: '(111) 111-1111', role_id: 1, status: 'active' }

  async function openDetail(page: Page, permissions = ['view users', 'update users']) {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [
      { method: 'GET', match: '/common/users/11', body: ok(DETAIL) },
      { method: 'POST', match: '/common/roles/fetch-roles', body: ok(ROLES) },
    ])
    await page.goto('/user-details/11')
    await expect(page.locator('#name')).toHaveValue('Alice Admin')
    return api
  }

  test('loads the user into the form', async ({ page }) => {
    await openDetail(page)
    await expect(page.locator('#email')).toHaveValue('alice@example.test')
    await expect(page.locator('#phone_number')).toHaveValue('(111) 111-1111')
  })

  test('required fields block the save and show inline errors', async ({ page }) => {
    const api = await openDetail(page)
    await page.locator('#name').fill('')
    await page.locator('#email').fill('')
    await page.locator('#phone_number').fill('')
    await page.getByRole('button', { name: /update/i }).click()
    await expect(page.getByText('Name is required')).toBeVisible()
    await expect(page.getByText('Email is required')).toBeVisible()
    // The phone number is optional.
    await expect(page.getByText('Phone number is required')).toHaveCount(0)
    expect(api.find('PUT', '/common/users/11')).toHaveLength(0)
  })

  test('rejects a malformed email', async ({ page }) => {
    await openDetail(page)
    await page.locator('#email').fill('not-an-email')
    await page.getByRole('button', { name: /update/i }).click()
    await expect(page.getByText('Email is invalid')).toBeVisible()
  })

  test('typing clears the field error', async ({ page }) => {
    await openDetail(page)
    await page.locator('#name').fill('')
    await page.getByRole('button', { name: /update/i }).click()
    await expect(page.getByText('Name is required')).toBeVisible()
    await page.locator('#name').fill('Alice')
    await expect(page.getByText('Name is required')).toHaveCount(0)
  })

  test('saves changes with a PUT and confirms with a toast', async ({ page }) => {
    const api = await openDetail(page)
    api.add({ method: 'PUT', match: '/common/users/11', body: ok({ ...DETAIL, name: 'Alice Updated' }) })
    await page.locator('#name').fill('Alice Updated')
    await page.getByRole('button', { name: /update/i }).click()
    const call = await expectCall(api, 'PUT', '/common/users/11')
    expect(call.json).toMatchObject({ name: 'Alice Updated', email: 'alice@example.test', role_id: 1, status: 'active', change_password: false })
    await expect(page.getByText('User updated successfully')).toBeVisible()
  })

  test('change-password fields appear on demand and must match', async ({ page }) => {
    const api = await openDetail(page)
    await expect(page.getByPlaceholder('Enter new password', { exact: true })).toHaveCount(0)
    await page.getByLabel('Change Account Password').check()
    await page.getByPlaceholder('Enter new password', { exact: true }).fill('NewPassw0rd')
    await page.getByPlaceholder('Re-enter new password').fill('Different1')
    await page.getByRole('button', { name: /update/i }).click()
    await expect(page.getByText('Passwords do not match')).toBeVisible()
    expect(api.find('PUT', '/common/users/11')).toHaveLength(0)
  })

  test('change-password requires both fields', async ({ page }) => {
    await openDetail(page)
    await page.getByLabel('Change Account Password').check()
    await page.getByRole('button', { name: /update/i }).click()
    await expect(page.getByText('New password is required')).toBeVisible()
    await expect(page.getByText('Confirm password is required')).toBeVisible()
  })

  test('a matching password change is sent with change_password=true', async ({ page }) => {
    const api = await openDetail(page)
    api.add({ method: 'PUT', match: '/common/users/11', body: ok(DETAIL) })
    await page.getByLabel('Change Account Password').check()
    await page.getByPlaceholder('Enter new password', { exact: true }).fill('NewPassw0rd')
    await page.getByPlaceholder('Re-enter new password').fill('NewPassw0rd')
    await page.getByRole('button', { name: /update/i }).click()
    const call = await expectCall(api, 'PUT', '/common/users/11')
    expect(call.json).toMatchObject({ change_password: true, new_password: 'NewPassw0rd', confirm_password: 'NewPassw0rd' })
  })

  test('server field errors are rendered under the field', async ({ page }) => {
    const api = await openDetail(page)
    api.add({
      method: 'PUT', match: '/common/users/11', status: 422,
      body: failure('Invalid', { email: ['The email has already been taken.'] }),
    })
    await page.getByRole('button', { name: /update/i }).click()
    await expect(page.getByText('The email has already been taken.')).toBeVisible()
  })

  test('Update is hidden without the update permission', async ({ page }) => {
    await openDetail(page, ['view users'])
    await expect(page.getByRole('button', { name: /update/i })).toHaveCount(0)
  })

  test('Back returns to the list', async ({ page }) => {
    await openDetail(page)
    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL(/\/users$/)
  })
})

test.describe('User details - create', () => {
  test('requires employee, name, email, role and password before saving - not the phone', async ({ page }) => {
    await seedSession(page, { permissions: ['view users', 'create users'] })
    const api = await mockApi(page, [{ method: 'POST', match: '/common/roles/fetch-roles', body: ok(ROLES) }])
    await page.goto('/users/create')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('Please select an employee')).toBeVisible()
    await expect(page.getByText('Name is required')).toBeVisible()
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Phone number is required')).toHaveCount(0)
    await expect(page.getByText('Role is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
    expect(api.find('POST', /\/common\/users$/)).toHaveLength(0)
  })
})

// BUG-109: /users/create opened directly at the seat limit offers to buy a
// seat as soon as the page opens, as the list's + Add User does.
test.describe('User details - create, opened directly at the seat limit', () => {
  async function openCreateAtSeatLimit(page: Page, isFreeTrial: boolean) {
    await seedSession(page, { is_host: 0, entity_type: 'Partner', permissions: ['view users', 'create users'] } as never)
    const api = await mockApi(page, [
      { method: 'GET', match: '/common/user-details', body: ok({ user: { is_host: 0, is_free_trail: isFreeTrial } }) },
      { method: 'GET', match: '/common/user-count', body: ok({ count: 3, seat_limit: 3, per_user_price: 49 }) },
      { method: 'GET', match: '/common/employees-available-for-user', body: ok([]) },
      { method: 'POST', match: '/common/roles/fetch-roles', body: ok(ROLES) },
      { method: 'POST', match: '/common/users/fetch-users', body: paginated(USERS) },
    ])
    await page.goto('/users/create')
    return api
  }

  test('a paid partner is offered a seat straight away, and Cancel goes back to the list', async ({ page }) => {
    await openCreateAtSeatLimit(page, false)

    const window = page.locator('.modal.show')
    await expect(window).toContainText('User Limit Reached')
    await window.getByRole('button', { name: 'Cancel' }).click()

    await expect(page).toHaveURL(/\/users$/)
    // The window's grey overlay goes with it.
    await expect(page.locator('.modal-backdrop')).toHaveCount(0)
    await expect(page.locator('body')).not.toHaveClass(/modal-open/)
  })

  // BUG-070: inactive users keep their seat; the message says so and how to free one.
  test('the limit message says inactive users take a seat and how to free one', async ({ page }) => {
    await openCreateAtSeatLimit(page, false)

    const window = page.locator('.modal.show')
    await expect(window).toContainText('All 3 user seats are in use. Inactive users still take a seat.')
    await expect(window).toContainText('To free one, delete a user you no longer need, or buy an additional seat below.')
    await expect(window).not.toContainText('Payment is required')
  })

  test('Proceed opens the form with the seat purchase pending', async ({ page }) => {
    await openCreateAtSeatLimit(page, false)

    const window = page.locator('.modal.show')
    await expect(window).toContainText('User Limit Reached')
    await window.getByRole('button', { name: /proceed/i }).click()

    await expect(page.getByText(/seat purchase pending activation/i)).toBeVisible()
    await expect(page.locator('.modal.show')).toHaveCount(0)
    await expect(page).toHaveURL(/\/users\/create$/)
  })

  test('a free-trial partner is told it is a paid feature, and closing goes back to the list', async ({ page }) => {
    await openCreateAtSeatLimit(page, true)

    const notice = page.locator('.modal.show')
    await expect(notice).toContainText('Paid Version Only')
    await notice.getByRole('button', { name: 'Close' }).click()

    await expect(page).toHaveURL(/\/users$/)
    await expect(page.locator('.modal-backdrop')).toHaveCount(0)
  })
})

// BUG-202: paying the bought seat's invoice needs "Pay Invoice", as Pay Now on
// Invoices does. Without it the user is still created and the invoice waits.
test.describe('User details - paying for a bought seat', () => {
  const EMPLOYEE = { id: 7, first_name: 'Jane Doe', full_name: 'Jane Doe', email: 'jane@example.test', phone_number_1: '5551234567', country_code: '+1', employee_code: 'EMP-00007' }

  async function buySeatAndSave(page: Page, permissions: string[]) {
    await seedSession(page, { is_host: 0, entity_type: 'Partner', permissions: ['view users', 'create users', ...permissions] } as never)
    const api = await mockApi(page, [
      { method: 'GET', match: '/common/user-details', body: ok({ user: { is_host: 0, is_free_trail: false } }) },
      { method: 'GET', match: '/common/user-count', body: ok({ count: 3, seat_limit: 3, per_user_price: 49 }) },
      { method: 'GET', match: '/common/employees-available-for-user', body: ok([EMPLOYEE]) },
      { method: 'POST', match: '/common/roles/fetch-roles', body: ok(ROLES) },
      { method: 'POST', match: '/common/users/fetch-users', body: paginated(USERS) },
      { method: 'POST', match: /\/common\/users$/, body: ok({ id: 51, invoice_id: 88 }, 'User created successfully') },
      { method: 'GET', match: /\/common\/invoices\/88$/, body: ok({ id: 88, invoice_id: 'INV-88', status: 'Unpaid', payment_amount: 49, displayable_payment_amount: '$49.00' }) },
    ])
    await page.goto('/users/create')
    await page.locator('.modal.show').getByRole('button', { name: /proceed/i }).click()
    await expect(page.getByText(/seat purchase pending activation/i)).toBeVisible()

    await pickPrime(page, page.locator('#user-employee').locator('xpath=ancestor::div[contains(@class,"p-dropdown")][1]'), /Jane Doe/)
    await pickPrime(page, page.locator('#role_id').locator('xpath=ancestor::div[contains(@class,"p-dropdown")][1]'), 'Agent')
    await page.getByLabel(/^password/i).fill('secret123')
    await page.getByRole('button', { name: /^\W*save$/i }).click()
    await expectCall(api, 'POST', /\/common\/users$/)
    return api
  }

  test('someone holding Pay Invoice goes on to pay the seat invoice', async ({ page }) => {
    const api = await buySeatAndSave(page, ['Pay Invoice'])

    await expectCall(api, 'GET', /\/common\/invoices\/88$/)
    await expect(page).toHaveURL(/\/users\/create$/)
  })

  test('without Pay Invoice, the seat invoice is left waiting and the list opens', async ({ page }) => {
    const api = await buySeatAndSave(page, [])

    await expect(page).toHaveURL(/\/users$/)
    await expect(page.getByText('User created. Its seat invoice is still unpaid - someone with the Pay Invoice permission can pay it from Invoices.')).toBeVisible()
    expect(api.find('GET', /\/common\/invoices\/88$/)).toHaveLength(0)
  })
})

// R3-BUG-030: on your own record the role and status are locked; the API
// refuses changing your own, so the team can't lock itself out of Users.
test.describe('User details - your own record', () => {
  test("role and status can't be changed on your own record, and it says why", async ({ page }) => {
    await seedSession(page, { id: 11, permissions: ['view users', 'update users'] })
    await mockApi(page, [
      { method: 'POST', match: '/common/roles/fetch-roles', body: ok(ROLES) },
      { method: 'GET', match: /\/common\/users\/11$/, body: ok({ id: 11, name: 'Alice Admin', email: 'alice@example.test', phone_number: '5551112222', role_id: 1, status: 'active' }) },
    ])
    await page.goto('/user-details/11')

    await expect(page.getByPlaceholder('Enter full name').or(page.locator('input[name="name"]')).first()).toHaveValue('Alice Admin')
    await expect(page.locator('#role_id').locator('xpath=ancestor::div[contains(@class,"p-dropdown")][1]')).toHaveClass(/p-disabled/)
    await expect(page.locator('#status').locator('xpath=ancestor::div[contains(@class,"p-dropdown")][1]')).toHaveClass(/p-disabled/)
    await expect(page.getByText("You can't change your own role or account status. Ask another administrator.")).toBeVisible()
  })
})
