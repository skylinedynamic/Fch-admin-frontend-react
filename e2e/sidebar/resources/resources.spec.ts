import { test, expect, type Page } from '@playwright/test'
import {
  mockApi, ok, failure, seedSession, expectCall, confirmDelete, cancelDelete, type ApiMock,
} from '../../support/helpers'

const GROUPED = {
  legal_registration: [
    { id: 101, title: 'LLC Formation Guide', subtitle: 'Step by step', icon: 'ri-file-line', status: true, link: 'https://example.test/llc', resource_type: 'legal_registration' },
    { id: 102, title: 'EIN Checklist', subtitle: null, icon: null, status: false, file_url: 'https://example.test/ein.pdf', resource_type: 'legal_registration' },
  ],
  business_services: [],
  download_assets: [
    { id: 103, title: 'Brand Kit', subtitle: 'Logos', icon: null, status: true, resource_type: 'download_assets' },
  ],
  education_help: [],
  training_academy: [],
}
const ALL = ['view resources', 'create resources', 'update resources', 'delete resources']

async function openManage(page: Page, permissions: string[] = ALL): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, [{ method: 'GET', match: /\/common\/resources$/, body: ok(GROUPED) }])
  await page.goto('/manage-resources')
  await expect(page.getByText('LLC Formation Guide')).toBeVisible()
  return api
}

const rowMenu = (page: Page, title: string) => page.locator('tr', { hasText: title }).locator('[data-bs-toggle="dropdown"]')

test.describe('Manage resources', () => {
  test('lists the resources of the default category with status and link', async ({ page }) => {
    await openManage(page)
    const active = page.locator('tr', { hasText: 'LLC Formation Guide' })
    await expect(active.getByText('Active')).toBeVisible()
    await expect(active.getByRole('link', { name: /visit link/i })).toHaveAttribute('href', 'https://example.test/llc')
    const inactive = page.locator('tr', { hasText: 'EIN Checklist' })
    await expect(inactive.getByText('Inactive')).toBeVisible()
    await expect(inactive.getByRole('link', { name: /view file/i })).toHaveAttribute('href', 'https://example.test/ein.pdf')
  })

  test('switching tabs shows that category', async ({ page }) => {
    await openManage(page)
    await page.getByRole('button', { name: 'Download Assets' }).click()
    await expect(page.getByText('Brand Kit')).toBeVisible()
    await expect(page.getByText('LLC Formation Guide')).toHaveCount(0)
    await expect(page.locator('tr', { hasText: 'Brand Kit' }).getByText('N/A')).toBeVisible()
  })

  test('an empty category shows the empty message', async ({ page }) => {
    await openManage(page)
    await page.getByRole('button', { name: 'Training Academy' }).click()
    await expect(page.getByText('No resources found for this category.')).toBeVisible()
  })

  test('Add Resource opens the create form', async ({ page }) => {
    await openManage(page)
    await page.getByRole('button', { name: /add resource/i }).click()
    await expect(page).toHaveURL(/\/resources\/create/)
  })

  test('the row menu Edit opens the edit form', async ({ page }) => {
    await openManage(page)
    await rowMenu(page, 'LLC Formation Guide').click()
    await page.getByRole('button', { name: /edit/i }).first().click()
    await expect(page).toHaveURL(/\/resources\/edit\/101/)
  })

  test('the row menu Delete removes the resource after confirmation', async ({ page }) => {
    const api = await openManage(page)
    api.add({ method: 'DELETE', match: '/admin/resources/101', body: ok(null) })
    await rowMenu(page, 'LLC Formation Guide').click()
    await page.locator('tr', { hasText: 'LLC Formation Guide' }).getByRole('button', { name: /delete/i }).click()
    await confirmDelete(page)
    await expectCall(api, 'DELETE', '/admin/resources/101')
    await expect(page.getByText('Resource deleted successfully')).toBeVisible()
  })

  test('closing the confirmation keeps the resource', async ({ page }) => {
    const api = await openManage(page)
    await rowMenu(page, 'LLC Formation Guide').click()
    await page.locator('tr', { hasText: 'LLC Formation Guide' }).getByRole('button', { name: /delete/i }).click()
    await cancelDelete(page)
    expect(api.find('DELETE', '/admin/resources/')).toHaveLength(0)
  })

  test('a failed delete is reported', async ({ page }) => {
    const api = await openManage(page)
    api.add({ method: 'DELETE', match: '/admin/resources/101', status: 500, body: failure('boom') })
    await rowMenu(page, 'LLC Formation Guide').click()
    await page.locator('tr', { hasText: 'LLC Formation Guide' }).getByRole('button', { name: /delete/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Failed to delete resource')).toBeVisible()
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/manage-resources')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Resource form', () => {
  const CREATE = /\/admin\/resources$/

  async function openCreate(page: Page) {
    await seedSession(page, { permissions: ALL })
    const api = await mockApi(page, [{ method: 'GET', match: /\/common\/resources$/, body: ok(GROUPED) }])
    await page.goto('/resources/create')
    await expect(page.locator('#title')).toBeVisible()
    return api
  }

  test('server validation errors mark the fields', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: CREATE, status: 422,
      body: failure('The given data was invalid.', { title: ['The title field is required.'], resource_type: ['The resource type field is required.'] }),
    })
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.locator('#title')).toHaveClass(/is-invalid/)
    await expect(page.getByText('The title field is required.')).toBeVisible()
    await expect(page).toHaveURL(/\/resources\/create/)
  })

  test('typing clears the field error', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, status: 422, body: failure('Invalid', { title: ['The title field is required.'] }) })
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.locator('#title')).toHaveClass(/is-invalid/)
    await page.locator('#title').fill('Something')
    await expect(page.locator('#title')).not.toHaveClass(/is-invalid/)
  })

  test('a new resource is posted and the resources page opens', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, body: ok({ id: 200 }) })
    await page.locator('#title').fill('Operating Agreement Template')
    await page.locator('#subtitle').fill('Editable DOCX')
    await page.getByRole('button', { name: /save/i }).click()
    const call = await expectCall(api, 'POST', CREATE)
    expect(call.body).toContain('Operating Agreement Template')
    expect(call.body).toContain('Editable DOCX')
    await expect(page.getByText('Resource created successfully')).toBeVisible()
    await expect(page).toHaveURL(/\/resources$/)
  })

  test('a general failure is reported', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, status: 500, body: failure('Resource library is read-only.') })
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('Resource library is read-only.').first()).toBeVisible()
  })

  test('Back returns to the resources page', async ({ page }) => {
    await openCreate(page)
    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL(/\/resources$/)
  })

  test('editing loads the resource and Update posts to its id', async ({ page }) => {
    await seedSession(page, { permissions: ALL })
    const api = await mockApi(page, [
      { method: 'GET', match: /\/common\/resources$/, body: ok(GROUPED) },
      { method: 'GET', match: '/common/resources/101', body: ok(GROUPED.legal_registration[0]) },
    ])
    api.add({ method: 'POST', match: '/admin/resources/101', body: ok(GROUPED.legal_registration[0]) })
    await page.goto('/resources/edit/101')
    await expect(page.locator('#title')).toHaveValue('LLC Formation Guide')
    await page.locator('#title').fill('LLC Formation Guide v2')
    await page.getByRole('button', { name: /update/i }).click()
    const call = await expectCall(api, 'POST', '/admin/resources/101')
    expect(call.body).toContain('LLC Formation Guide v2')
    await expect(page.getByText('Resource updated successfully')).toBeVisible()
  })
})

test.describe('Resource screens need more than the view permission', () => {
  // A partner holds "view resources" only. The API refuses resource changes
  // from them, so the forms must not open either.
  const VIEW_ONLY = { permissions: ['view resources'], is_host: 0, partner_id: 5, entity_type: 'Partner' }

  for (const path of ['/resources/create', '/resources/edit/101', '/manage-resources']) {
    test(`${path} is blocked with only the view permission`, async ({ page }) => {
      await seedSession(page, VIEW_ONLY)
      await mockApi(page)
      await page.goto(path)
      await expect(page).toHaveURL(/access-denied/)
    })
  }

  test('the resources list itself stays open with only the view permission', async ({ page }) => {
    await seedSession(page, VIEW_ONLY)
    await mockApi(page)
    await page.goto('/resources')
    await expect(page).toHaveURL(/\/resources$/)
  })
})
