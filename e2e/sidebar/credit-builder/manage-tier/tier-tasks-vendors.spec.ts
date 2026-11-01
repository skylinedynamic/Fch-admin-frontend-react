import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, confirmDelete, cancelDelete, selectRow, openActionsMenu, pickPrime, type ApiMock } from '../../../support/helpers'

/**
 * Inside a tier: its tasks and its vendors (Credit Builder › Manage Tier ›
 * a tier). tiers.spec.ts covers the tier list and the tier form itself.
 */

const CB = '/admin/credit-builder'
// The tier pages need view tier (BUG-125); the task and vendor actions need update tier.
const DEVELOPER = { role_name: 'Developer', permissions: ['view tier', 'update tier'] }

const T0 = { id: 1, name: 'Tier 0', title: 'Business Foundation', subtitle: 'Get set up', code: 'T0', status: 'active', has_vendor: 0 }
const T1 = { id: 2, name: 'Tier 1', title: 'Vendor Credit', subtitle: 'Net-30 accounts', code: 'T1', status: 'active', has_vendor: 1 }

const TASKS = [
  { id: 11, title: 'Open a vendor account', subtitle: 'Net-30', estimated_completion_days: 7, order: 1, manual_verification: 1, vendor_id: 31 },
  { id: 12, title: 'Pay first invoice', subtitle: 'On time', estimated_completion_days: 30, order: 2, manual_verification: 1, vendor_id: null },
]
const VENDORS = [
  { id: 31, name: 'Uline', category: 'Office Supplies', requirements: ['EIN'], benefits: ['Net-30'], report_to: ['D&B'], status: 'active', tier_id: 2 },
  { id: 32, name: 'Quill', category: 'Office Supplies', requirements: [], benefits: [], report_to: ['Experian'], status: 'inactive', tier_id: 2 },
]

async function openTier(page: Page, tier = T1): Promise<ApiMock> {
  await seedSession(page, DEVELOPER)
  const api = await mockApi(page, [
    { method: 'GET', match: new RegExp(`${CB}/tiers/${tier.id}$`), body: ok(tier) },
    { method: 'POST', match: `${CB}/tier-tasks/fetch-tasks`, body: paginated(TASKS) },
    { method: 'POST', match: `${CB}/vendors/fetch-vendors`, body: paginated(VENDORS) },
    { method: 'GET', match: `${CB}/tier-related-api/${tier.id}`, body: ok([{ id: 7, name: 'MicroBilt Business Verify' }]) },
  ])
  await page.goto(`/tiers/${tier.id}`)
  await expect(page.locator('input[name="name"]')).toHaveValue(tier.name)
  return api
}

const openTasks = async (page: Page) => {
  await page.getByText('Task Information').click()
  await expect(page.getByText('Open a vendor account')).toBeVisible()
}
const taskModal = (page: Page) => page.locator('.modal.show', { has: page.locator('.modal-title') })

test.describe('Tier tasks - create', () => {
  test('an automated task on the vendor tier must name its vendor', async ({ page }) => {
    const api = await openTier(page)
    await openTasks(page)
    await page.getByRole('button', { name: /add task/i }).click()
    await expect(taskModal(page).getByText('Add New Task')).toBeVisible()

    await taskModal(page).getByPlaceholder('Enter task title').fill('Apply with Grainger')
    await taskModal(page).getByRole('button', { name: /save/i }).click()

    await expect(taskModal(page).getByText('Vendor is required')).toBeVisible()
    expect(api.find('POST', new RegExp(`${CB}/tier-tasks$`))).toHaveLength(0)
  })

  // BUG-095: the dialog learned the tier from the task list's own request; on
  // a slow API it treated Tier 1 as another tier and saved without a vendor.
  test("a slow tier request no longer lets a Tier 1 task skip its vendor", async ({ page }) => {
    const api = await openTier(page)
    // The page has its tier; every later request for it (the task list's) hangs.
    await page.route(new RegExp(`${CB}/tiers/2$`), () => new Promise(() => {}))
    await openTasks(page)
    await page.getByRole('button', { name: /add task/i }).click()

    await expect(taskModal(page).getByText('Related Vendor')).toBeVisible()
    await taskModal(page).getByPlaceholder('Enter task title').fill('Apply with Uline')
    await taskModal(page).getByRole('button', { name: /save/i }).click()
    await expect(taskModal(page).getByText('Vendor is required')).toBeVisible()
    expect(api.find('POST', new RegExp(`${CB}/tier-tasks$`))).toHaveLength(0)
  })

  test('while the vendors load, the dropdown says so instead of looking empty', async ({ page }) => {
    await seedSession(page, DEVELOPER)
    await mockApi(page, [
      { method: 'GET', match: new RegExp(`${CB}/tiers/2$`), body: ok(T1) },
      { method: 'POST', match: `${CB}/tier-tasks/fetch-tasks`, body: paginated(TASKS) },
      { method: 'GET', match: `${CB}/tier-related-api/2`, body: ok([]) },
    ])
    await page.route(new RegExp(`${CB}/vendors/fetch-vendors$`), () => new Promise(() => {}))
    await page.goto('/tiers/2')
    await openTasks(page)
    await page.getByRole('button', { name: /add task/i }).click()

    await expect(taskModal(page).locator('.p-dropdown-label', { hasText: 'Loading vendors…' })).toBeVisible()
  })

  test('the dialog no longer offers manual verification, so a vendor-tier task always names a vendor', async ({ page }) => {
    // The "Manual Verification" checkbox is commented out in TierTaskModal.jsx.
    await openTier(page)
    await openTasks(page)
    await page.getByRole('button', { name: /add task/i }).click()
    await expect(taskModal(page).getByText('Add New Task')).toBeVisible()
    await expect(taskModal(page).locator('#manualVerificationCheckbox')).toHaveCount(0)
    await expect(taskModal(page).getByText('Related Vendor')).toBeVisible()
  })

  test('an automated task is posted with the chosen vendor', async ({ page }) => {
    const api = await openTier(page)
    api.add({ method: 'POST', match: new RegExp(`${CB}/tier-tasks$`), body: ok({ id: 13 }) })
    await openTasks(page)
    await page.getByRole('button', { name: /add task/i }).click()

    await taskModal(page).getByPlaceholder('Enter task title').fill('Apply with Uline')
    await pickPrime(page, taskModal(page).locator('.p-dropdown').first(), 'Uline')
    await taskModal(page).getByRole('button', { name: /save/i }).click()

    const call = await expectCall(api, 'POST', new RegExp(`${CB}/tier-tasks$`))
    expect(call.json).toMatchObject({
      tier_id: 2, title: 'Apply with Uline', vendor_id: 31, related_api_id: null, manual_verification: 0,
    })
    await expect(page.getByText('Task created successfully')).toBeVisible()
  })

  test('validation errors from the API are shown in the dialog', async ({ page }) => {
    const api = await openTier(page)
    api.add({ method: 'POST', match: new RegExp(`${CB}/tier-tasks$`), status: 422, body: failure('Invalid', { title: 'The title field is required.' }) })
    await openTasks(page)
    await page.getByRole('button', { name: /add task/i }).click()
    await pickPrime(page, taskModal(page).locator('.p-dropdown').first(), 'Uline')
    await taskModal(page).getByRole('button', { name: /save/i }).click()

    await expect(taskModal(page).getByText('The title field is required.')).toBeVisible()
    await expect(taskModal(page)).toBeVisible()
  })

  test('a general failure is toasted', async ({ page }) => {
    const api = await openTier(page)
    api.add({ method: 'POST', match: new RegExp(`${CB}/tier-tasks$`), status: 500, body: failure('Task service is down.') })
    await openTasks(page)
    await page.getByRole('button', { name: /add task/i }).click()
    await taskModal(page).getByPlaceholder('Enter task title').fill('Anything')
    await pickPrime(page, taskModal(page).locator('.p-dropdown').first(), 'Uline')
    await taskModal(page).getByRole('button', { name: /save/i }).click()

    await expect(page.getByText('Task service is down.').first()).toBeVisible()
  })

  test('on a non-vendor tier the task is verified by an API instead of a vendor', async ({ page }) => {
    const api = await openTier(page, T0)
    api.add({ method: 'POST', match: new RegExp(`${CB}/tier-tasks$`), body: ok({ id: 14 }) })
    await page.getByText('Task Information').click()
    await expect(page.getByText('Open a vendor account')).toBeVisible()
    // Tier 0 offers no "Add Task" (only Tier 1 does), so the row editor is the way in.
    await page.locator('tr', { hasText: 'Pay first invoice' }).locator('.btn-soft-primary').click()

    await expect(taskModal(page).getByText('Verified By Api')).toBeVisible()
    await expectCall(api, 'GET', `${CB}/tier-related-api/1`)
  })
})

test.describe('Tier tasks - edit and delete', () => {
  test('editing a task PUTs the change', async ({ page }) => {
    const api = await openTier(page)
    api.add({ method: 'PUT', match: `${CB}/tier-tasks/12`, body: ok(TASKS[1]) })
    await openTasks(page)

    await page.locator('tr', { hasText: 'Pay first invoice' }).locator('.btn-soft-primary').click()
    await expect(taskModal(page).getByText('Edit Task')).toBeVisible()
    await expect(taskModal(page).getByPlaceholder('Enter task title')).toHaveValue('Pay first invoice')
    await taskModal(page).getByPlaceholder('Enter task title').fill('Pay the first invoice early')
    await taskModal(page).getByRole('button', { name: /update/i }).click()

    const call = await expectCall(api, 'PUT', `${CB}/tier-tasks/12`)
    expect(call.json).toMatchObject({ tier_id: 2, title: 'Pay the first invoice early', manual_verification: 1 })
    await expect(page.getByText('Task updated successfully')).toBeVisible()
  })

  // BUG-095: the API has no DELETE tier-tasks/{id} (it was a 405); one task goes through the bulk delete.
  test('deleting one task from its row uses the bulk-delete endpoint with its id', async ({ page }) => {
    const api = await openTier(page)
    api.add({ method: 'POST', match: `${CB}/tier-tasks-multiple-delete`, body: ok(null) })
    await openTasks(page)

    await page.locator('tr', { hasText: 'Open a vendor account' }).locator('.btn-soft-danger').click()
    await confirmDelete(page)

    const call = await expectCall(api, 'POST', `${CB}/tier-tasks-multiple-delete`)
    expect(call.json).toEqual({ ids: [11] })
    expect(api.find('DELETE', `${CB}/tier-tasks/11`)).toHaveLength(0)
    await expect(page.getByText('Task(s) deleted successfully')).toBeVisible()
  })

  test('a task clients already use is refused: the confirmation closes and a dialog says why', async ({ page }) => {
    const api = await openTier(page)
    api.add({
      method: 'POST', match: `${CB}/tier-tasks-multiple-delete`, status: 422,
      body: { status: false, message: 'Clients are already using these tasks, so they cannot be deleted. Nothing was deleted.', errors: { in_use: [{ id: 11, name: 'Open a vendor account' }] } },
    })
    await openTasks(page)

    await page.locator('tr', { hasText: 'Open a vendor account' }).locator('.btn-soft-danger').click()
    await confirmDelete(page)

    const blocked = page.locator('.modal.show', { hasText: 'Task Cannot Be Deleted' })
    await expect(blocked).toContainText('Clients are already using "Open a vendor account", so it cannot be deleted.')
    await expect(page.locator('.modal.show', { hasText: 'Yes, Delete It' })).toHaveCount(0)
    await expect(page.locator('.Toastify__toast--error')).toHaveCount(0)
    await blocked.getByRole('button', { name: 'Close' }).last().click()
    await expect(page.locator('tr', { hasText: 'Open a vendor account' })).toBeVisible()
  })

  test('selected tasks are deleted in one bulk request', async ({ page }) => {
    const api = await openTier(page)
    api.add({ method: 'POST', match: `${CB}/tier-tasks-multiple-delete`, body: ok(null) })
    await openTasks(page)

    await selectRow(page, 0)
    await selectRow(page, 1)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)

    const call = await expectCall(api, 'POST', `${CB}/tier-tasks-multiple-delete`)
    expect(call.json).toEqual({ ids: [11, 12] })
  })

  test('closing the confirmation deletes nothing', async ({ page }) => {
    const api = await openTier(page)
    await openTasks(page)
    await page.locator('tr', { hasText: 'Open a vendor account' }).locator('.btn-soft-danger').click()
    await cancelDelete(page)
    expect(api.calls.filter((c) => c.path.includes('tier-tasks') && c.method !== 'POST' && c.method !== 'GET')).toHaveLength(0)
  })
})

test.describe('Tier vendors', () => {
  const openVendors = async (page: Page) => {
    await page.locator('button.nav-link', { hasText: 'Vendors' }).click()
    await expect(page.getByText('Uline').first()).toBeVisible()
  }
  const vendorModal = (page: Page) => page.locator('.modal.show', { hasText: /Vendor/ })

  test('the Vendors tab only exists on a tier that has vendors', async ({ page }) => {
    await openTier(page, T0)
    await expect(page.locator('button.nav-link', { hasText: 'Vendors' })).toHaveCount(0)
  })

  test('lists the tier vendors with their status', async ({ page }) => {
    const api = await openTier(page)
    await openVendors(page)
    await expect(page.getByText('Quill').first()).toBeVisible()
    expect(api.find('POST', `${CB}/vendors/fetch-vendors`)[0].json).toMatchObject({ tier_id: 2 })
  })

  test('vendor search is sent to the API', async ({ page }) => {
    const api = await openTier(page)
    await openVendors(page)
    await page.getByPlaceholder('Search vendors...').fill('quill')
    await page.locator('button.btn-warning').last().click()
    await expect.poll(() => JSON.stringify(api.find('POST', `${CB}/vendors/fetch-vendors`).at(-1)?.json ?? {})).toContain('quill')
  })

  test('adding a vendor posts it for this tier', async ({ page }) => {
    const api = await openTier(page)
    api.add({ method: 'POST', match: new RegExp(`${CB}/vendors$`), body: ok({ id: 33 }) })
    await openVendors(page)

    await page.getByRole('button', { name: /add vendor/i }).click()
    await expect(vendorModal(page).getByText('Add New Vendor')).toBeVisible()
    await vendorModal(page).getByPlaceholder('Enter vendor name').fill('Grainger')
    await vendorModal(page).getByPlaceholder('Enter affiliate URL').fill('https://grainger.test/apply')
    await vendorModal(page).getByRole('button', { name: /save/i }).click()

    const call = await expectCall(api, 'POST', new RegExp(`${CB}/vendors$`))
    expect(call.body).toContain('Grainger')
    expect(call.body).toContain('https://grainger.test/apply')
    await expect(page.getByText('Vendor created successfully')).toBeVisible()
  })

  test('vendor validation errors from the API are shown in the dialog', async ({ page }) => {
    const api = await openTier(page)
    api.add({ method: 'POST', match: new RegExp(`${CB}/vendors$`), status: 422, body: failure('Invalid', { name: 'The name field is required.' }) })
    await openVendors(page)
    await page.getByRole('button', { name: /add vendor/i }).click()
    await vendorModal(page).getByRole('button', { name: /save/i }).click()

    await expect(vendorModal(page).getByText('The name field is required.')).toBeVisible()
  })

  test('clicking a vendor opens it for editing and saves with PUT', async ({ page }) => {
    const api = await openTier(page)
    api.add({ method: 'PUT', match: `${CB}/vendors/31`, body: ok(VENDORS[0]) })
    api.add({ method: 'POST', match: `${CB}/vendors/31`, body: ok(VENDORS[0]) })
    await openVendors(page)

    await page.getByText('Uline').first().click()
    await expect(vendorModal(page).getByText('Edit Vendor')).toBeVisible()
    await expect(vendorModal(page).getByPlaceholder('Enter vendor name')).toHaveValue('Uline')
    await vendorModal(page).getByPlaceholder('Enter vendor name').fill('Uline Inc')
    await vendorModal(page).getByRole('button', { name: /update/i }).click()

    await expect(page.getByText('Vendor updated successfully')).toBeVisible()
    const sent = api.calls.filter((c) => c.path === `${CB}/vendors/31` && c.method !== 'GET')
    expect(sent.length).toBe(1)
    expect(sent[0].body).toContain('Uline Inc')
  })

  test('selected vendors are deleted in one bulk request', async ({ page }) => {
    const api = await openTier(page)
    api.add({ method: 'POST', match: `${CB}/vendors-multiple-delete`, body: ok(null) })
    await openVendors(page)

    await selectRow(page, 1)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)

    const call = await expectCall(api, 'POST', `${CB}/vendors-multiple-delete`)
    expect(call.json).toEqual({ ids: [32] })
    await expect(page.getByText('Vendor(s) deleted successfully')).toBeVisible()
  })

  test('vendors tasks still use are refused: the confirmation closes and a dialog lists them', async ({ page }) => {
    const api = await openTier(page)
    const message = 'Tier tasks use these vendors, so they cannot be deleted. Move those tasks to another vendor first. Nothing was deleted.'
    api.add({
      method: 'POST', match: `${CB}/vendors-multiple-delete`, status: 422,
      body: { status: false, message, errors: { in_use: [{ id: 31, name: 'Uline' }, { id: 32, name: 'Quill' }] } },
    })
    await openVendors(page)

    await selectRow(page, 0)
    await selectRow(page, 1)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)

    const blocked = page.locator('.modal.show', { hasText: 'Vendors Cannot Be Deleted' })
    await expect(blocked).toContainText(message)
    await expect(blocked.locator('li')).toHaveText(['Uline', 'Quill'])
    await expect(page.locator('.modal.show', { hasText: 'Yes, Delete It' })).toHaveCount(0)
    await expect(page.locator('.Toastify__toast--error')).toHaveCount(0)
  })

  test('the logo File Manager opens over the vendor dialog, not behind it', async ({ page }) => {
    await openTier(page)
    await openVendors(page)
    await page.getByText('Uline').first().click()
    await expect(vendorModal(page).getByText('Edit Vendor')).toBeVisible()

    await vendorModal(page).getByRole('button', { name: /choose logo|change logo/i }).click()

    const fileManager = page.locator('.modal.show', { hasText: 'Select Files' })
    await expect(fileManager).toBeVisible()
    const box = (await fileManager.locator('.modal-content').boundingBox())!
    const onTop = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.modal-content')?.textContent?.includes('Select Files') ?? false, { x: box.x + 40, y: box.y + 20 })
    expect(onTop).toBe(true)
  })
})
