import { test, expect, type Page } from '@playwright/test'
import {
  mockApi, ok, paginated, failure, seedSession, expectCall, confirmDelete, cancelDelete,
  selectRow, openActionsMenu, type ApiMock,
} from '../../support/helpers'

const EMPLOYEES = [
  { id: 21, full_name: 'Erin Employee', first_name: 'Erin Employee', employee_code: 'EMP-001', phone_number: '(111) 222-3333', email: 'erin@example.test', department: 'Sales', designation: 'Rep', job_status: 'active' },
  { id: 22, full_name: 'Omar Operator', first_name: 'Omar Operator', employee_code: 'EMP-002', phone_number: '(111) 222-4444', email: 'omar@example.test', department: 'Ops', designation: 'Lead', job_status: 'inactive' },
]
const LIST = '/common/employees/fetch-employees'

async function openList(page: Page, permissions: string[]): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(EMPLOYEES) }])
  await page.goto('/employees')
  await expect(page.getByText('Erin Employee')).toBeVisible()
  return api
}

test.describe('Employees list', () => {
  test('renders employees from the API', async ({ page }) => {
    await openList(page, ['view employees'])
    await expect(page.getByText('Omar Operator')).toBeVisible()
    await expect(page.getByText('EMP-001')).toBeVisible()
    await expect(page.getByText('erin@example.test')).toBeVisible()
  })

  test('search is sent in the request body', async ({ page }) => {
    const api = await openList(page, ['view employees'])
    await page.getByPlaceholder('Search here...').fill('omar')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => api.find('POST', LIST).at(-1)?.json.search).toBe('omar')
  })

  test('Clear resets the search box', async ({ page }) => {
    await openList(page, ['view employees'])
    await page.getByPlaceholder('Search here...').fill('omar')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(page.getByPlaceholder('Search here...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view employees'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/employees')
    await expect(page.getByText('No employees found')).toBeVisible()
  })

  test('clicking a row opens the employee details', async ({ page }) => {
    await openList(page, ['view employees'])
    await page.getByText('EMP-001').click()
    await expect(page).toHaveURL(/\/employee-details\/21$/)
  })

  test('Add Employee needs the create permission', async ({ page }) => {
    await openList(page, ['view employees'])
    await expect(page.getByRole('button', { name: /add employee/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /add employee/i })).toHaveCount(0)
  })

  test('Add Employee opens the create page', async ({ page }) => {
    await openList(page, ['view employees', 'create employees'])
    await page.getByText('Add Employee').click()
    await expect(page).toHaveURL(/\/employees\/create/)
  })

  test('row selection is hidden without the delete permission', async ({ page }) => {
    await openList(page, ['view employees'])
    await expect(page.locator('.p-datatable-tbody .p-checkbox')).toHaveCount(0)
  })
})

test.describe('Employees bulk delete', () => {
  test('deletes the selected employees after confirmation', async ({ page }) => {
    const api = await openList(page, ['view employees', 'delete employees'])
    api.add({ method: 'POST', match: '/common/employees/multiple-delete', body: ok(null) })
    await selectRow(page, 0)
    await selectRow(page, 1)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    const call = await expectCall(api, 'POST', '/common/employees/multiple-delete')
    expect(call.json).toEqual({ ids: [21, 22] })
    await expect(page.getByText('Employees deleted successfully')).toBeVisible()
  })

  test('closing the confirmation cancels the delete', async ({ page }) => {
    const api = await openList(page, ['view employees', 'delete employees'])
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await cancelDelete(page)
    expect(api.find('POST', '/common/employees/multiple-delete')).toHaveLength(0)
  })

  test('a failed delete is reported', async ({ page }) => {
    const api = await openList(page, ['view employees', 'delete employees'])
    api.add({ method: 'POST', match: '/common/employees/multiple-delete', status: 500, body: failure('boom') })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Failed to delete employees. Please try again.')).toBeVisible()
  })
})

test.describe('Employee create', () => {
  const CREATE = /\/common\/employees$/

  async function openCreate(page: Page) {
    await seedSession(page, { permissions: ['view employees', 'create employees'] })
    const api = await mockApi(page)
    await page.goto('/employees/create')
    await expect(page.getByPlaceholder('Enter full name')).toBeVisible()
    return api
  }

  // The same rule as Users › Add User: at the seat limit a partner on a free
  // trial is told it is a paid feature, a paid partner is offered a seat.
  async function openCreateAtSeatLimit(page: Page, isFreeTrial: boolean) {
    await seedSession(page, { is_host: 0, entity_type: 'Partner', permissions: ['view employees', 'create employees'] } as never)
    const api = await mockApi(page, [
      { method: 'GET', match: '/common/user-details', body: ok({ user: { is_host: 0, is_free_trail: isFreeTrial } }) },
      { method: 'GET', match: '/common/user-count', body: ok({ count: 3, seat_limit: 3, per_user_price: 49 }) },
    ])
    await page.goto('/employees/create')
    await expect(page.getByPlaceholder('Enter full name')).toBeVisible()
    return api
  }

  test('a free-trial partner at the seat limit is told it is a paid feature', async ({ page }) => {
    await openCreateAtSeatLimit(page, true)
    await page.locator('#createAccountCheckbox').check({ force: true })

    await expect(page.getByText('Paid Version Only')).toBeVisible()
    await expect(page.getByText(/This feature is available in Paid version/)).toBeVisible()
    await expect(page.getByText('User Limit Reached')).toBeHidden()
    await expect(page.locator('#createAccountCheckbox')).not.toBeChecked()
  })

  test('a paid partner at the seat limit is offered a seat to buy', async ({ page }) => {
    await openCreateAtSeatLimit(page, false)
    await page.locator('#createAccountCheckbox').check({ force: true })

    await expect(page.getByText('User Limit Reached')).toBeVisible()
    await expect(page.getByText('Paid Version Only')).toBeHidden()
  })

  test('server validation errors are shown inline', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: CREATE, status: 422,
      body: failure('Invalid', {
        first_name: ['The name field is required.'],
        email: ['The email field is required.'],
        designation: ['The designation field is required.'],
      }),
    })
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('The name field is required.')).toBeVisible()
    await expect(page.getByText('The email field is required.')).toBeVisible()
    await expect(page.getByText('The designation field is required.')).toBeVisible()
    await expect(page).toHaveURL(/\/employees\/create/)
  })

  // What the real API answers when only name, position and email are filled in:
  // only the country is still missing - the other details are optional.
  test('the fields the API requires are reported next to each of them', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: CREATE, status: 422,
      body: failure('Country is required.', { country: 'Country is required.' } as never),
    })
    await page.getByPlaceholder('Enter full name').fill('Nina New')
    await page.getByPlaceholder('Enter position').fill('Analyst')
    await page.locator('input[name="email"]').fill('nina@example.test')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('Country is required.').first()).toBeVisible()
    for (const message of ['Department is required.', 'Phone number is required.', 'Address is required.', 'State is required.', 'City is required.']) {
      await expect(page.getByText(message)).toHaveCount(0)
    }
    await expect(page).toHaveURL(/\/employees\/create/)
  })

  test('the form is posted with the entered values', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, body: ok({ employee: { id: 99 } }) })
    await page.getByPlaceholder('Enter full name').fill('Nina New')
    await page.getByPlaceholder('Enter position').fill('Analyst')
    await page.locator('input[name="email"]').fill('nina@example.test')
    await page.getByRole('button', { name: /save/i }).click()
    const call = await expectCall(api, 'POST', CREATE)
    expect(call.json).toMatchObject({ first_name: 'Nina New', designation: 'Analyst', email: 'nina@example.test' })
    await expect(page.getByText('Employee created successfully')).toBeVisible()
  })

  test('Back returns to the list', async ({ page }) => {
    await openCreate(page)
    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL(/\/employees$/)
  })

  test('the create page is blocked without the create permission', async ({ page }) => {
    await seedSession(page, { permissions: ['view employees'] })
    await mockApi(page)
    await page.goto('/employees/create')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Department modal', () => {
  async function openModal(page: Page) {
    await seedSession(page, { permissions: ['view employees', 'create employees'] })
    const api = await mockApi(page)
    await page.goto('/employees/create')
    // The button sits inside the field's <label>, so it has no button role of its own in the a11y tree.
    await page.locator('button', { hasText: 'Add New' }).click()
    await expect(page.getByRole('dialog', { name: 'Add New Department' })).toBeVisible()
    return api
  }

  test('an empty department name is rejected client-side', async ({ page }) => {
    const api = await openModal(page)
    await page.getByRole('button', { name: /submit/i }).click()
    await expect(page.getByText('Department name is required')).toBeVisible()
    expect(api.find('POST', /\/common\/departments$/)).toHaveLength(0)
  })

  test('a new department is posted', async ({ page }) => {
    const api = await openModal(page)
    api.add({ method: 'POST', match: /\/common\/departments$/, body: ok({ id: 3, name: 'Legal' }) })
    await page.locator('#deptName').fill('Legal')
    await page.getByRole('button', { name: /submit/i }).click()
    const call = await expectCall(api, 'POST', /\/common\/departments$/)
    expect(call.json).toEqual({ name: 'Legal' })
    await expect(page.getByText('Department added successfully')).toBeVisible()
  })

  test('Cancel closes the modal without saving', async ({ page }) => {
    const api = await openModal(page)
    await page.locator('#deptName').fill('Legal')
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog', { name: 'Add New Department' })).toBeHidden()
    expect(api.find('POST', /\/common\/departments$/)).toHaveLength(0)
  })
})

test.describe('Employee edit', () => {
  async function openEdit(page: Page) {
    await seedSession(page, { permissions: ['view employees', 'update employees'] })
    const api = await mockApi(page, [{ method: 'GET', match: /\/common\/employees\/21$/, body: ok(EMPLOYEES[0]) }])
    await page.goto('/employee-details/21')
    await expect(page.getByPlaceholder('Enter full name')).toHaveValue('Erin Employee')
    return api
  }

  test('loads the employee into the form', async ({ page }) => {
    await openEdit(page)
    await expect(page.getByPlaceholder('Enter position')).toHaveValue('Rep')
    await expect(page.locator('input[name="email"]')).toHaveValue('erin@example.test')
  })

  test('Update sends the changes and confirms', async ({ page }) => {
    const api = await openEdit(page)
    // The service POSTs multipart when a file is attached and PUTs otherwise.
    api.add({ method: 'POST', match: /\/common\/employees\/21$/, body: ok({ employee: EMPLOYEES[0] }) })
    api.add({ method: 'PUT', match: /\/common\/employees\/21$/, body: ok({ employee: EMPLOYEES[0] }) })
    await page.getByPlaceholder('Enter position').fill('Senior Rep')
    await page.getByRole('button', { name: /update/i }).click()
    await expect(page.getByText('Employee updated successfully')).toBeVisible()
    const calls = api.calls.filter((c) => /\/common\/employees\/21$/.test(c.path) && c.method !== 'GET')
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[0].body).toContain('Senior Rep')
  })

  test('validation errors on update are shown inline', async ({ page }) => {
    const api = await openEdit(page)
    api.add({ match: /\/common\/employees\/21$/, method: 'POST', status: 422, body: failure('Invalid', { email: ['The email has already been taken.'] }) })
    api.add({ match: /\/common\/employees\/21$/, method: 'PUT', status: 422, body: failure('Invalid', { email: ['The email has already been taken.'] }) })
    await page.getByRole('button', { name: /update/i }).click()
    await expect(page.getByText('The email has already been taken.')).toBeVisible()
  })
})
