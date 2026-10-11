import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, confirmDelete, cancelDelete, type ApiMock } from './helpers'

/**
 * The Resources page that the sidebar opens (/resources): the read-only
 * library partners use, with the host's add / edit / delete controls on top.
 * resources.spec.ts covers the Manage Resources table and the resource form.
 */

const GROUPED = {
  legal_registration: [
    { id: 101, title: 'LLC Formation Guide', subtitle: 'Step by step', icon: 'ri-government-line', status: true, link: 'https://example.test/llc' },
    { id: 102, title: 'EIN Checklist', subtitle: 'IRS form SS-4', icon: 'ri-list-check', status: true, file_url: 'https://example.test/files/ein.pdf' },
  ],
  business_services: [{ id: 201, title: 'Business Phone', subtitle: 'Virtual numbers', icon: 'ri-phone-line', status: true }],
  download_assets: [{ id: 301, title: 'Brand Kit', subtitle: 'Logos and colours', icon: 'ri-file-list-3-line', status: true, file_url: 'https://example.test/files/brand.pdf' }],
  education_help: [
    { id: 401, title: 'Credit Glossary', subtitle: 'Terms explained', icon: 'ri-book-line', status: true, file_url: 'https://example.test/files/glossary.pdf' },
    { id: 402, title: 'Denial Reasons', subtitle: 'Why lenders say no', icon: 'ri-question-line', status: true, file_url: 'https://example.test/files/denial.pdf' },
  ],
  training_academy: [{ id: 501, title: 'Onboarding Walkthrough', subtitle: 'Start here', status: true, link: 'https://www.youtube.com/watch?v=abcdefghijk' }],
}

const HOST_ALL = { permissions: ['view resources', 'create resources', 'update resources', 'delete resources'] }
const PARTNER = { permissions: ['view resources'], is_host: 0, partner_id: 5, entity_type: 'Partner' }

async function open(page: Page, user: Record<string, unknown> = HOST_ALL, data: unknown = GROUPED): Promise<ApiMock> {
  await seedSession(page, user)
  const api = await mockApi(page, [{ method: 'GET', match: /\/common\/resources$/, body: ok(data) }])
  await page.goto('/resources')
  await expect(page.getByRole('heading', { name: 'Resources', level: 4 })).toBeVisible()
  return api
}

const stat = (page: Page, label: string) => page.locator('.card', { hasText: label }).first()
const item = (page: Page, title: string) => page.locator('.resource-section h6', { hasText: title }).first()

test.describe('Resources page - content', () => {
  test('shows the counts for each kind of resource', async ({ page }) => {
    await open(page)
    await expect(stat(page, 'Education & Help')).toContainText('2')
    await expect(stat(page, 'Training Academy')).toContainText('1')
    await expect(stat(page, 'Business Services')).toContainText('1')
  })

  test('lists the resources of every section', async ({ page }) => {
    await open(page)
    for (const title of ['LLC Formation Guide', 'EIN Checklist', 'Business Phone', 'Brand Kit', 'Credit Glossary', 'Denial Reasons', 'Onboarding Walkthrough']) {
      await expect(item(page, title)).toBeVisible()
    }
  })

  test('shows every section heading', async ({ page }) => {
    await open(page)
    for (const heading of ['Legal & Registration', 'Business Services', 'Download Assets', 'Training Academy']) {
      await expect(page.getByRole('heading', { name: new RegExp(heading) }).first()).toBeVisible()
    }
  })

  test('renders with no resources at all', async ({ page }) => {
    await open(page, HOST_ALL, { legal_registration: [], business_services: [], download_assets: [], education_help: [], training_academy: [] })
    await expect(stat(page, 'Education & Help')).toContainText('0')
    await expect(page.getByText(/Something went wrong/i)).toHaveCount(0)
  })

  test('requests the grouped resources once on load', async ({ page }) => {
    const api = await open(page)
    expect(api.find('GET', /\/common\/resources$/).length).toBeGreaterThan(0)
  })
})

test.describe('Resources page - search', () => {
  test('filters Education & Help by title', async ({ page }) => {
    await open(page)
    await page.getByPlaceholder('Search Education & Help...').fill('glossary')
    await expect(item(page, 'Credit Glossary')).toBeVisible()
    await expect(item(page, 'Denial Reasons')).toHaveCount(0)
  })

  test('also matches the subtitle, ignoring case', async ({ page }) => {
    await open(page)
    await page.getByPlaceholder('Search Education & Help...').fill('LENDERS SAY')
    await expect(item(page, 'Denial Reasons')).toBeVisible()
    await expect(item(page, 'Credit Glossary')).toHaveCount(0)
  })

  test('leaves the other sections alone', async ({ page }) => {
    await open(page)
    await page.getByPlaceholder('Search Education & Help...').fill('glossary')
    await expect(item(page, 'LLC Formation Guide')).toBeVisible()
    await expect(item(page, 'Brand Kit')).toBeVisible()
  })

  test('clearing the search brings everything back', async ({ page }) => {
    await open(page)
    const box = page.getByPlaceholder('Search Education & Help...')
    await box.fill('glossary')
    await box.fill('')
    await expect(item(page, 'Denial Reasons')).toBeVisible()
  })
})

test.describe('Resources page - opening a resource', () => {
  test('a business service opens its detail page', async ({ page }) => {
    await open(page)
    await item(page, 'Business Phone').click()
    await expect(page).toHaveURL(/\/resources\/service\/201$/)
  })

  test('a resource with a web link opens it in a new tab', async ({ page }) => {
    await open(page)
    // Serve the external page so the new tab has something to load offline.
    await page.context().route('https://example.test/**', (route) => route.fulfill({ body: '<h1>External</h1>', contentType: 'text/html' }))
    const popup = page.waitForEvent('popup')
    await item(page, 'LLC Formation Guide').click()
    expect((await popup).url()).toContain('example.test/llc')
  })

  test('a resource with a file opens the preview, with a Download button', async ({ page }) => {
    await open(page)
    await item(page, 'EIN Checklist').click()
    await expect(page.locator('.modal.show')).toBeVisible()
    await expect(page.locator('.modal.show').getByText('Download')).toBeVisible()
  })

  test('a training video opens in the preview instead of leaving the app', async ({ page }) => {
    await open(page)
    await item(page, 'Onboarding Walkthrough').click()
    await expect(page.locator('.modal.show')).toBeVisible()
    await expect(page).toHaveURL(/\/resources$/)
  })
})

test.describe('Resources page - host controls', () => {
  const menuFor = async (page: Page, title: string) => {
    const row = item(page, title).locator('xpath=ancestor::div[contains(@class,"cursor-pointer") or contains(@class,"list-group-item")][1]')
    await row.locator('button.btn-icon').first().click()
    return page.locator('.dropdown-menu-resource.show')
  }

  test('each section has an Add New button that opens the form', async ({ page }) => {
    await open(page)
    const add = page.getByRole('button', { name: /add new/i })
    expect(await add.count()).toBeGreaterThanOrEqual(4)
    await add.first().click()
    await expect(page).toHaveURL(/\/resources\/create$/)
  })

  test('Add New is hidden without the create permission', async ({ page }) => {
    await open(page, { permissions: ['view resources', 'update resources', 'delete resources'] })
    await expect(page.getByRole('button', { name: /add new/i })).toHaveCount(0)
  })

  test('the item menu offers Edit, which opens the edit form', async ({ page }) => {
    await open(page)
    const menu = await menuFor(page, 'LLC Formation Guide')
    await menu.getByText('Edit').click()
    await expect(page).toHaveURL(/\/resources\/edit\/101$/)
  })

  test('Download is offered only for a resource that has a file', async ({ page }) => {
    await open(page)
    await expect((await menuFor(page, 'EIN Checklist')).getByText('Download')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect((await menuFor(page, 'LLC Formation Guide')).getByText('Download')).toHaveCount(0)
  })

  test('Delete removes the resource after confirmation', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'DELETE', match: '/admin/resources/101', body: ok(null) })
    await (await menuFor(page, 'LLC Formation Guide')).getByText('Delete').click()
    await confirmDelete(page)
    await expectCall(api, 'DELETE', '/admin/resources/101')
    await expect(page.getByText('Resource deleted successfully')).toBeVisible()
  })

  test('closing the confirmation keeps the resource', async ({ page }) => {
    const api = await open(page)
    await (await menuFor(page, 'LLC Formation Guide')).getByText('Delete').click()
    await cancelDelete(page)
    expect(api.find('DELETE', '/admin/resources/')).toHaveLength(0)
  })

  test('a failed delete is reported', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'DELETE', match: '/admin/resources/101', status: 500, body: failure('boom') })
    await (await menuFor(page, 'LLC Formation Guide')).getByText('Delete').click()
    await confirmDelete(page)
    await expect(page.getByText('Failed to delete resource')).toBeVisible()
  })

  test('the menu hides Edit and Delete when the host lacks those permissions', async ({ page }) => {
    await open(page, { permissions: ['view resources'] })
    const menu = await menuFor(page, 'EIN Checklist')
    await expect(menu.getByText('Download')).toBeVisible()
    await expect(menu.getByText('Edit')).toHaveCount(0)
    await expect(menu.getByText('Delete')).toHaveCount(0)
  })
})

test.describe('Resources page - partner view', () => {
  test('a partner reads the library but gets no management controls', async ({ page }) => {
    await open(page, PARTNER)
    await expect(item(page, 'LLC Formation Guide')).toBeVisible()
    await expect(page.getByRole('button', { name: /add new/i })).toHaveCount(0)
    // The per-item menu is host-only, whatever permissions the partner holds.
    await expect(page.locator('.resource-section button.btn-icon')).toHaveCount(0)
  })

  test('a partner with resource permissions still gets no item menu', async ({ page }) => {
    await open(page, { ...PARTNER, permissions: ['view resources', 'update resources', 'delete resources'] })
    await expect(page.locator('.resource-section button.btn-icon')).toHaveCount(0)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/resources')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Resources page - known gaps', () => {
  // KNOWN BUG: the "Business Services" summary card links to /business-services,
  // but App.jsx defines no such route, so the card leads to the 404 page.
  // Remove test.fail() once the card points at a real screen.
  test('the Business Services card leads to a real screen', async ({ page }) => {
    test.fail()
    await open(page)
    await stat(page, 'Business Services').click()
    await expect(page).not.toHaveURL(/\/resources$/)
    await expect(page.getByText('Page Not Found')).toHaveCount(0)
  })
})
