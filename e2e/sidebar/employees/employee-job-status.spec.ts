import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, pickPrime } from '../../support/helpers'

// R2 BUG-029: an employee was stored with job status "[object Object]" - the
// form appended the picked option itself instead of its value. The status is
// now sent as its value, on create and on update.

const CREATE = /\/common\/employees$/
const jobStatus = (page: Page) => page.locator('.p-dropdown', { has: page.locator('#job_status') })

test.describe('Employee › Job Status is sent as its value (R2 BUG-029)', () => {
  test('a new employee is posted with the status picked, never "[object Object]"', async ({ page }) => {
    await seedSession(page, { permissions: ['view employees', 'create employees'] })
    const api = await mockApi(page, [{ method: 'POST', match: CREATE, body: ok({ employee: { id: 99 } }) }])
    await page.goto('/employees/create')
    await expect(page.getByPlaceholder('Enter full name')).toBeVisible()

    await page.getByPlaceholder('Enter full name').fill('Nina New')
    await page.getByPlaceholder('Enter position').fill('Analyst')
    await page.locator('input[name="email"]').fill('nina@example.test')
    await pickPrime(page, jobStatus(page), 'Inactive')
    await page.getByRole('button', { name: /save/i }).click()

    const call = await expectCall(api, 'POST', CREATE)
    expect(call.json).toMatchObject({ first_name: 'Nina New', job_status: 'Inactive' })
    expect(call.body).not.toContain('[object Object]')
    await expect(page.getByText('Employee created successfully')).toBeVisible()
  })

  test('an update sends the status picked as its value', async ({ page }) => {
    const employee = {
      id: 21, full_name: 'Erin Employee', first_name: 'Erin Employee', employee_code: 'EMP-001', phone_number: '(111) 222-3333',
      email: 'erin@example.test', department: 'Sales', designation: 'Rep', job_status: 'Active',
    }
    await seedSession(page, { permissions: ['view employees', 'update employees'] })
    const api = await mockApi(page, [
      { method: 'GET', match: /\/common\/employees\/21$/, body: ok(employee) },
      { method: 'POST', match: /\/common\/employees\/21$/, body: ok({ employee }) },
      { method: 'PUT', match: /\/common\/employees\/21$/, body: ok({ employee }) },
    ])
    await page.goto('/employee-details/21')
    await expect(page.getByPlaceholder('Enter full name')).toHaveValue('Erin Employee')

    await pickPrime(page, jobStatus(page), 'Suspended')
    await page.getByRole('button', { name: /update/i }).click()

    await expect(page.getByText('Employee updated successfully')).toBeVisible()
    const saved = api.calls.filter((c) => /\/common\/employees\/21$/.test(c.path) && c.method !== 'GET')
    expect(saved.length).toBeGreaterThan(0)
    expect(saved[0].json).toMatchObject({ job_status: 'Suspended' })
    expect(saved[0].body).not.toContain('[object Object]')
  })
})
