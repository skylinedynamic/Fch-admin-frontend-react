import { test, expect, type Page } from '@playwright/test'
import {
  mockApi, ok, paginated, failure, seedSession, expectCall, confirmDelete, cancelDelete,
  selectRow, openActionsMenu, type ApiMock,
} from '../../support/helpers'

const GROUPS = [{ id: 1, name: 'Business Loans' }, { id: 2, name: 'Credit Lines' }]
const TYPES = [{ id: 1, name: 'SBA Loan' }, { id: 2, name: 'Term Loan' }]
const FUNDINGS = [
  { id: 201, name: 'SBA 7(a)', group: GROUPS[0], type: TYPES[0], amount_range: '$50k - $5M', terms: '10 years', status: 'Active' },
  { id: 202, name: 'Working Capital Line', group: GROUPS[1], type: TYPES[1], amount_range: '$10k - $250k', terms: 'Revolving', status: 'Inactive' },
]
const LIST = '/common/funding-sequencings/fetch'

function base() {
  return [
    { method: 'POST', match: LIST, body: paginated(FUNDINGS) },
    { method: 'GET', match: '/admin/funding-groups', body: ok(GROUPS) },
    { method: 'GET', match: '/admin/funding-types', body: ok(TYPES) },
  ]
}

async function openList(page: Page): Promise<ApiMock> {
  await seedSession(page)
  const api = await mockApi(page, base())
  await page.goto('/funding')
  await expect(page.getByText('SBA 7(a)')).toBeVisible()
  return api
}

test.describe('Funding sequences list', () => {
  test('renders sequences with group, type and status', async ({ page }) => {
    await openList(page)
    const row = page.locator('tr', { hasText: 'Working Capital Line' })
    await expect(row.getByText('Credit Lines')).toBeVisible()
    await expect(row.getByText('Term Loan')).toBeVisible()
    await expect(row.getByText('Inactive')).toBeVisible()
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search here...').fill('capital')
    await page.getByRole('button', { name: /^.?\s*filters$/i }).or(page.locator('button.btn-warning')).first().click()
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('capital')
  })

  test('Clear empties the search box', async ({ page }) => {
    await openList(page)
    await page.getByPlaceholder('Search here...').fill('capital')
    await page.locator('button', { hasText: 'Clear' }).click()
    await expect(page.getByPlaceholder('Search here...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page)
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/funding')
    await expect(page.getByText('No funding found')).toBeVisible()
  })

  test('a failed list request is reported', async ({ page }) => {
    await seedSession(page)
    await mockApi(page, [{ method: 'POST', match: LIST, body: failure('Funding catalogue unavailable.') }])
    await page.goto('/funding')
    await expect(page.getByText('Funding catalogue unavailable.').first()).toBeVisible()
  })

  test('the name opens the sequence', async ({ page }) => {
    await openList(page)
    await page.getByText('SBA 7(a)').click()
    await expect(page).toHaveURL(/\/funding\/201$/)
  })

  test('Add Funding Sequence opens the create form', async ({ page }) => {
    await openList(page)
    await page.getByRole('link', { name: /add funding sequence/i }).click()
    await expect(page).toHaveURL(/\/funding\/create/)
  })

  test('clicking the status badge toggles it without opening the row', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'PATCH', match: '/admin/funding-sequencings/201/status', body: ok(null) })
    await page.locator('tr', { hasText: 'SBA 7(a)' }).getByTitle('Click to change status').click()
    const call = await expectCall(api, 'PATCH', '/admin/funding-sequencings/201/status')
    expect(call.json).toEqual({ status: 'Inactive' })
    await expect(page.getByText('Status updated to Inactive')).toBeVisible()
    await expect(page).toHaveURL(/\/funding$/)
  })

  test('a failed status change is reported', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'PATCH', match: '/admin/funding-sequencings/201/status', status: 500, body: failure('boom') })
    await page.locator('tr', { hasText: 'SBA 7(a)' }).getByTitle('Click to change status').click()
    await expect(page.getByText('Failed to update status')).toBeVisible()
  })

  test('non-host users cannot reach the funding catalogue', async ({ page }) => {
    await seedSession(page, { is_host: 0, partner_id: 5 })
    await mockApi(page, base())
    await page.goto('/funding')
    await expect(page).not.toHaveURL(/\/funding/)
  })
})

test.describe('Funding sequences bulk delete', () => {
  test('deletes every selected sequence after confirmation', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'DELETE', match: /\/admin\/funding-sequencings\/\d+$/, body: ok(null) })
    await selectRow(page, 0)
    await selectRow(page, 1)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Funding options deleted successfully')).toBeVisible()
    expect(api.find('DELETE', '/admin/funding-sequencings/').map((c) => c.path).sort())
      .toEqual(['/admin/funding-sequencings/201', '/admin/funding-sequencings/202'])
  })

  test('closing the confirmation cancels the delete', async ({ page }) => {
    const api = await openList(page)
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await cancelDelete(page)
    expect(api.find('DELETE', '/admin/funding-sequencings/')).toHaveLength(0)
  })

  test('a failed delete is reported', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'DELETE', match: /\/admin\/funding-sequencings\/\d+$/, status: 500, body: failure('boom') })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Failed to delete funding options')).toBeVisible()
  })
})

test.describe('Funding sequence create', () => {
  const CREATE = /\/admin\/funding-sequencings$/
  const save = (page: Page) => page.locator('button[form="funding-sequencing-form"]')

  async function openCreate(page: Page) {
    await seedSession(page)
    const api = await mockApi(page, base())
    await page.goto('/funding/create')
    await expect(page.locator('input[name="name"]')).toBeVisible()
    return api
  }

  test('server validation errors mark the display fields', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: CREATE, status: 422,
      body: failure('Invalid', { name: 'The name field is required.', funding_group_id: 'The funding group field is required.' }),
    })
    await save(page).click()
    await expect(page.locator('input[name="name"]')).toHaveClass(/is-invalid/)
    await expect(page.getByText('The name field is required.').first()).toBeVisible()
    await expect(page).toHaveURL(/\/funding\/create/)
  })

  test('a new sequence is posted and its underwriting tab opens', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, body: ok({ id: 300 }) })
    await page.locator('input[name="name"]').fill('Equipment Financing')
    await page.locator('input[name="min_amount"]').fill('10000')
    await page.locator('input[name="max_amount"]').fill('500000')
    await page.locator('input[name="terms"]').fill('5 years')
    await save(page).click()
    const call = await expectCall(api, 'POST', CREATE)
    expect(JSON.stringify(call.json)).toContain('Equipment Financing')
    await expect(page.getByText('Funding sequence created successfully!')).toBeVisible()
    await expect(page).toHaveURL(/\/funding\/300\?tab=visibility/)
  })

  test('negative amounts cannot be typed', async ({ page }) => {
    await openCreate(page)
    const min = page.locator('input[name="min_amount"]')
    await min.click()
    await page.keyboard.type('-50')
    await expect(min).toHaveValue('50')
  })

  test('a general failure is toasted', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, status: 500, body: failure('Funding catalogue is locked.') })
    await save(page).click()
    await expect(page.getByText('Funding catalogue is locked.').first()).toBeVisible()
  })
})

// Groups and types are managed through twin dialogs opened from the form.
for (const kind of [
  { label: 'group', header: 'Manage Funding Groups', api: '/admin/funding-groups', rows: GROUPS, placeholder: 'e.g. Business Loans', added: 'Funding group added successfully', updated: 'Funding group updated successfully', deleted: 'Funding group deleted successfully' },
]) {
  test.describe(`Funding ${kind.label} dialog`, () => {
    async function openDialog(page: Page) {
      await seedSession(page)
      const api = await mockApi(page, base())
      await page.goto('/funding/create')
      await page.getByRole('button', { name: 'Add New' }).first().click()
      const dialog = page.getByRole('dialog', { name: kind.header })
      await expect(dialog).toBeVisible()
      return { api, dialog }
    }

    test('lists the existing entries', async ({ page }) => {
      const { dialog } = await openDialog(page)
      for (const row of kind.rows) await expect(dialog.getByText(row.name)).toBeVisible()
    })

    test('adds an entry with a trimmed name', async ({ page }) => {
      const { api, dialog } = await openDialog(page)
      api.add({ method: 'POST', match: kind.api, body: ok({ id: 9, name: 'Grants' }) })
      await dialog.getByPlaceholder(kind.placeholder).fill('  Grants ')
      await dialog.getByRole('button', { name: /add/i }).click()
      const call = await expectCall(api, 'POST', kind.api)
      expect(call.json).toEqual({ name: 'Grants' })
      await expect(page.getByText(kind.added)).toBeVisible()
    })

    test('a duplicate name shows the validation message inline', async ({ page }) => {
      const { api, dialog } = await openDialog(page)
      api.add({ method: 'POST', match: kind.api, status: 422, body: failure('Invalid', { name: 'The name has already been taken.' }) })
      await dialog.getByPlaceholder(kind.placeholder).fill(kind.rows[0].name)
      await dialog.getByRole('button', { name: /add/i }).click()
      await expect(dialog.getByText('The name has already been taken.')).toBeVisible()
    })

    test('renames an entry', async ({ page }) => {
      const { api, dialog } = await openDialog(page)
      api.add({ method: 'PUT', match: `${kind.api}/1`, body: ok({ id: 1, name: 'Renamed' }) })
      await dialog.getByTitle('Edit').first().click()
      const editor = dialog.locator('.bg-light input').first()
      await editor.fill('Renamed')
      await editor.press('Enter')
      const call = await expectCall(api, 'PUT', `${kind.api}/1`)
      expect(call.json).toMatchObject({ name: 'Renamed' })
      await expect(page.getByText(kind.updated)).toBeVisible()
    })

    test('deletes an entry after confirmation', async ({ page }) => {
      const { api, dialog } = await openDialog(page)
      api.add({ method: 'DELETE', match: `${kind.api}/1`, body: ok(null) })
      await dialog.getByTitle('Delete').first().click()
      await confirmDelete(page)
      await expectCall(api, 'DELETE', `${kind.api}/1`)
      await expect(page.getByText(kind.deleted)).toBeVisible()
    })

    test('a failed delete shows the server message', async ({ page }) => {
      const { api, dialog } = await openDialog(page)
      api.add({ method: 'DELETE', match: `${kind.api}/1`, status: 409, body: failure('This entry is used by a funding sequence.') })
      await dialog.getByTitle('Delete').first().click()
      await confirmDelete(page)
      await expect(page.getByText('This entry is used by a funding sequence.').first()).toBeVisible()
    })
  })
}

test.describe('Funding sequence edit', () => {
  test('loads the sequence and Update saves the display settings', async ({ page }) => {
    await seedSession(page)
    const api = await mockApi(page, [
      ...base(),
      { method: 'GET', match: /\/admin\/funding-sequencings\/201$/, body: ok({ ...FUNDINGS[0], funding_group_id: 1, funding_type_id: 1, min_amount: 50000, max_amount: 5000000 }) },
    ])
    api.add({ method: 'PUT', match: '/admin/funding-sequencings/201', body: ok(FUNDINGS[0]) })
    await page.goto('/funding/201')
    await expect(page.locator('input[name="name"]')).toHaveValue('SBA 7(a)')
    await page.locator('input[name="terms"]').fill('25 years')
    await page.locator('button[form="funding-sequencing-form"]').click()
    await expect(page.getByText('Display settings updated successfully!')).toBeVisible()
    const call = api.find('PUT', '/admin/funding-sequencings/201')[0]
    expect(JSON.stringify(call.json)).toContain('25 years')
  })

  test('a sequence that fails to load is reported', async ({ page }) => {
    await seedSession(page)
    await mockApi(page, [...base(), { method: 'GET', match: /\/admin\/funding-sequencings\/999$/, status: 404, body: failure('Not found') }])
    await page.goto('/funding/999')
    await expect(page.getByText('Failed to load funding details').first()).toBeVisible()
  })
})
