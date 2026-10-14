import { test, expect, type Page } from '@playwright/test'
import {
  mockApi, ok, paginated, failure, seedSession, expectCall, confirmDelete, cancelDelete,
  selectRow, openActionsMenu, laravelFailure, type ApiMock,
} from '../../../support/helpers'

const CMS = '/admin/cms'
const CATEGORIES = [{ id: 1, name: 'News', slug: 'news', blogs_count: 3 }, { id: 2, name: 'Guides', slug: 'guides', blogs_count: 0 }]
const TAGS = [{ id: 1, name: 'Funding', slug: 'funding', blogs_count: 2 }, { id: 2, name: 'Credit', slug: 'credit', blogs_count: 1 }]
const BLOGS = [
  { id: 91, title: 'How funding works', slug: 'how-funding-works', is_published: true, created_at: '2026-01-05', category: CATEGORIES[0] },
  { id: 92, title: 'Draft about credit', slug: 'draft-about-credit', is_published: false, created_at: '2026-02-10', category: null },
]
const BLOG_PERMS = ['view blogs', 'create blogs', 'update blogs', 'delete blogs']

function blogHandlers() {
  return [
    { method: 'POST', match: `${CMS}/blogs/fetch`, body: paginated(BLOGS, { statistics: { total: 2, published: 1, featured: 0, categories: 2 } }) },
    { method: 'GET', match: `${CMS}/blog-categories`, body: ok(CATEGORIES) },
    { method: 'GET', match: `${CMS}/blog-tags`, body: ok(TAGS) },
  ]
}

test.describe('Site settings', () => {
  const SETTINGS = {
    site_name: 'Four Corner Funding', site_slogan: 'Capital made simple', email: 'hello@fcf.test',
    phone_number: '(555) 000-1111', address: '1 Finance Way', map_iframe: '', social_links: [],
    header_logo: 'site-settings/logo.png', footer_logo: null, website_favicon: 'site-settings/favicon.ico',
  }

  async function open(page: Page, permissions = ['view site settings', 'update site settings']): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'GET', match: `${CMS}/site-settings`, body: ok(SETTINGS) }])
    await page.goto('/cms/site-settings')
    await expect(page.locator('input[name="site_name"]')).toHaveValue('Four Corner Funding')
    return api
  }

  test('loads the current settings into the form', async ({ page }) => {
    await open(page)
    await expect(page.locator('input[name="site_slogan"]')).toHaveValue('Capital made simple')
    await expect(page.locator('input[name="email"]')).toHaveValue('hello@fcf.test')
  })

  test('saving posts the edited values', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: `${CMS}/site-settings`, body: ok(SETTINGS, 'Site settings updated successfully') })
    await page.locator('input[name="site_slogan"]').fill('Funding without friction')
    await page.locator('button[form="site-settings-form"]').click()
    const call = await expectCall(api, 'POST', `${CMS}/site-settings`)
    expect(call.json).toMatchObject({ site_name: 'Four Corner Funding', site_slogan: 'Funding without friction' })
    await expect(page.getByText('Site settings updated successfully')).toBeVisible()
  })

  test('server validation errors mark the fields', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: `${CMS}/site-settings`, status: 422, body: failure('Invalid', { site_name: ['The site name field is required.'], email: ['The email must be valid.'] }) })
    await page.locator('input[name="site_name"]').fill('')
    await page.locator('button[form="site-settings-form"]').click()
    await expect(page.locator('input[name="site_name"]')).toHaveClass(/is-invalid/)
    await expect(page.locator('input[name="email"]')).toHaveClass(/is-invalid/)
  })

  test('a general failure is toasted', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: `${CMS}/site-settings`, status: 500, body: failure('Settings store is locked.') })
    await page.locator('button[form="site-settings-form"]').click()
    await expect(page.getByText('Settings store is locked.').first()).toBeVisible()
  })

  test('the save button is hidden for view-only users', async ({ page }) => {
    await open(page, ['view site settings'])
    await expect(page.locator('button[form="site-settings-form"]')).toHaveCount(0)
  })
})
