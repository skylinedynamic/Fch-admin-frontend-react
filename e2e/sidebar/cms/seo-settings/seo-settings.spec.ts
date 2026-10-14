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

// Categories and tags are the same screen over two endpoints.
for (const kind of [
  { label: 'Category', plural: 'categories', path: '/cms/blog-categories', api: `${CMS}/blog-categories`, rows: CATEGORIES },
  { label: 'Tag', plural: 'tags', path: '/cms/blog-tags', api: `${CMS}/blog-tags`, rows: TAGS },
]) {
  test.describe(`Blog ${kind.plural}`, () => {
    async function open(page: Page): Promise<ApiMock> {
      await seedSession(page, { permissions: BLOG_PERMS })
      const api = await mockApi(page, [{ method: 'GET', match: kind.api, body: ok(kind.rows) }])
      await page.goto(kind.path)
      await expect(page.getByRole('cell', { name: kind.rows[0].name, exact: true })).toBeVisible()
      return api
    }
    const dialog = (page: Page, mode: 'Add' | 'Edit') => page.getByRole('dialog', { name: `${mode} ${kind.label}` })

    test('lists the rows with slug and post count', async ({ page }) => {
      await open(page)
      await expect(page.getByRole('cell', { name: kind.rows[1].name, exact: true })).toBeVisible()
      await expect(page.getByText(kind.rows[0].slug, { exact: true })).toBeVisible()
    })

    test('shows the empty state', async ({ page }) => {
      await seedSession(page, { permissions: BLOG_PERMS })
      await mockApi(page, [{ method: 'GET', match: kind.api, body: ok([]) }])
      await page.goto(kind.path)
      await expect(page.getByText(`No ${kind.plural} found`)).toBeVisible()
    })

    test('creates a new one', async ({ page }) => {
      const api = await open(page)
      api.add({ method: 'POST', match: new RegExp(`${kind.api}$`), body: ok({ id: 9, name: 'Fresh', slug: 'fresh' }) })
      await page.getByRole('button', { name: new RegExp(`add ${kind.label}`, 'i') }).click()
      const dlg = dialog(page, 'Add')
      await dlg.locator('input').first().fill('Fresh')
      await dlg.getByPlaceholder('auto-generated if empty').fill('fresh')
      await dlg.getByRole('button', { name: 'Create' }).click()
      const call = await expectCall(api, 'POST', new RegExp(`${kind.api}$`))
      expect(call.json).toEqual({ name: 'Fresh', slug: 'fresh' })
      await expect(page.getByText(`${kind.label} created successfully`)).toBeVisible()
      await expect(dlg).toBeHidden()
    })

    test('server validation errors are shown in the dialog and cleared on typing', async ({ page }) => {
      const api = await open(page)
      api.add({ method: 'POST', match: new RegExp(`${kind.api}$`), status: 422, body: laravelFailure({ name: ['The name field is required.'] }) })
      await page.getByRole('button', { name: new RegExp(`add ${kind.label}`, 'i') }).click()
      const dlg = dialog(page, 'Add')
      await dlg.getByRole('button', { name: 'Create' }).click()
      await expect(dlg.getByText('The name field is required.')).toBeVisible()
      await dlg.locator('input').first().fill('x')
      await expect(dlg.getByText('The name field is required.')).toHaveCount(0)
    })

    test('Cancel closes the dialog without saving', async ({ page }) => {
      const api = await open(page)
      await page.getByRole('button', { name: new RegExp(`add ${kind.label}`, 'i') }).click()
      await dialog(page, 'Add').getByRole('button', { name: 'Cancel' }).click()
      await expect(dialog(page, 'Add')).toBeHidden()
      expect(api.find('POST', new RegExp(`${kind.api}$`))).toHaveLength(0)
    })

    test('edits an existing one', async ({ page }) => {
      const api = await open(page)
      const id = kind.rows[0].id
      api.add({ method: 'POST', match: new RegExp(`${kind.api}/${id}$`), body: ok(kind.rows[0]) })
      await page.locator('tr', { hasText: kind.rows[0].slug }).locator('.btn-soft-info').click()
      const dlg = dialog(page, 'Edit')
      await expect(dlg.locator('input').first()).toHaveValue(kind.rows[0].name)
      await dlg.locator('input').first().fill('Renamed')
      await dlg.getByRole('button', { name: 'Update' }).click()
      const call = await expectCall(api, 'POST', new RegExp(`${kind.api}/${id}$`))
      expect(call.json).toMatchObject({ name: 'Renamed' })
      await expect(page.getByText(`${kind.label} updated successfully`)).toBeVisible()
    })

    test('deletes after accepting the browser confirm', async ({ page }) => {
      const api = await open(page)
      api.add({ method: 'POST', match: `${kind.api}-multiple-delete`, body: ok(null) })
      page.once('dialog', (d) => d.accept())
      await page.locator('tr', { hasText: kind.rows[0].slug }).locator('.btn-soft-danger').click()
      const call = await expectCall(api, 'POST', `${kind.api}-multiple-delete`)
      expect(call.json).toEqual({ ids: [kind.rows[0].id] })
      await expect(page.getByText(`${kind.label} deleted successfully`)).toBeVisible()
    })

    test('dismissing the browser confirm keeps the row', async ({ page }) => {
      const api = await open(page)
      page.once('dialog', (d) => d.dismiss())
      await page.locator('tr', { hasText: kind.rows[0].slug }).locator('.btn-soft-danger').click()
      await page.waitForTimeout(300)
      expect(api.find('POST', `${kind.api}-multiple-delete`)).toHaveLength(0)
    })
  })
}

test.describe('SEO settings', () => {
  const SEO = [
    { id: 1, page_name: 'Home', path: '/', meta_title: 'Home | FCF', meta_description: 'Welcome', og_image: null },
    { id: 2, page_name: 'About', path: '/about', meta_title: 'About | FCF', meta_description: 'Who we are', og_image: null },
  ]
  const PERMS = ['view seo settings', 'update seo settings', 'delete seo settings']

  async function openList(page: Page, permissions: string[] = PERMS): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'POST', match: new RegExp(`${CMS}/seo-settings$`), body: paginated(SEO) }])
    await page.goto('/cms/seo-settings')
    await expect(page.getByText('Home | FCF')).toBeVisible()
    return api
  }

  test('renders the configured pages', async ({ page }) => {
    await openList(page)
    await expect(page.getByText('About | FCF')).toBeVisible()
  })

  test('search is sent to the API and Clear resets it', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder(/Search by page name/).fill('about')
    await page.locator('button.btn-warning', { hasText: 'Filter' }).click()
    await expect.poll(() => api.find('POST', new RegExp(`${CMS}/seo-settings$`)).at(-1)?.json.search).toBe('about')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(page.getByPlaceholder(/Search by page name/)).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: PERMS })
    await mockApi(page, [{ method: 'POST', match: new RegExp(`${CMS}/seo-settings$`), body: paginated([]) }])
    await page.goto('/cms/seo-settings')
    await expect(page.getByText('No SEO settings found.')).toBeVisible()
  })

  test('view-only users get no add button and no row selection', async ({ page }) => {
    await openList(page, ['view seo settings'])
    await expect(page.getByRole('button', { name: /add page seo/i })).toHaveCount(0)
    await expect(page.locator('.p-datatable-tbody .p-checkbox')).toHaveCount(0)
  })

  test('Add Page SEO opens the create page', async ({ page }) => {
    await openList(page)
    await page.getByRole('button', { name: /add page seo/i }).click()
    await expect(page).toHaveURL(/\/cms\/seo-settings\/create/)
  })

  test('Delete Selected deletes after confirmation', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'POST', match: `${CMS}/seo-settings-multiple-delete`, body: ok(null) })
    await selectRow(page, 1)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    const call = await expectCall(api, 'POST', `${CMS}/seo-settings-multiple-delete`)
    expect(call.json).toEqual({ ids: [2] })
    await expect(page.getByText('SEO settings deleted successfully')).toBeVisible()
  })

  test('the create form shows server validation errors', async ({ page }) => {
    await seedSession(page, { permissions: PERMS })
    const api = await mockApi(page, [{ method: 'POST', match: new RegExp(`${CMS}/seo-settings$`), body: paginated(SEO) }])
    api.add({
      method: 'POST', match: `${CMS}/seo-settings/store`, status: 422,
      body: laravelFailure({ meta_title: ['The SEO title field is required.'], page_name: ['The page field is required.'] }),
    })
    await page.goto('/cms/seo-settings/create')
    await page.locator('button[form="seo-form"]').click()
    await expect(page.getByText('The SEO title field is required.')).toBeVisible()
    await expect(page).toHaveURL(/\/cms\/seo-settings\/create/)
  })

  test('the create form posts the SEO fields', async ({ page }) => {
    await seedSession(page, { permissions: PERMS })
    const api = await mockApi(page, [{ method: 'POST', match: new RegExp(`${CMS}/seo-settings$`), body: paginated(SEO) }])
    api.add({ method: 'POST', match: `${CMS}/seo-settings/store`, body: ok({ id: 3 }) })
    await page.goto('/cms/seo-settings/create')
    await page.getByPlaceholder('SEO optimized title').fill('Contact | FCF')
    await page.getByPlaceholder(/Short description for search engines/).fill('Get in touch')
    await page.getByPlaceholder('keyword1, keyword2, keyword3').fill('contact, funding')
    await page.locator('button[form="seo-form"]').click()
    const call = await expectCall(api, 'POST', `${CMS}/seo-settings/store`)
    expect(call.json).toMatchObject({ meta_title: 'Contact | FCF', meta_description: 'Get in touch', keywords: 'contact, funding' })
    await expect(page.getByText('SEO settings created successfully')).toBeVisible()
    await expect(page).toHaveURL(/\/cms\/seo-settings$/)
  })

  test('the create route is blocked without the update permission', async ({ page }) => {
    await seedSession(page, { permissions: ['view seo settings'] })
    await mockApi(page)
    await page.goto('/cms/seo-settings/create')
    await expect(page).toHaveURL(/access-denied/)
  })
})
