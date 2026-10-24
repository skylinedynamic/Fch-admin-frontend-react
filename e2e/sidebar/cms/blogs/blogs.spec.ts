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

test.describe('Blogs list', () => {
  async function openList(page: Page, permissions: string[] = BLOG_PERMS): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, blogHandlers())
    await page.goto('/cms/blogs')
    await expect(page.getByText('How funding works')).toBeVisible()
    return api
  }

  test('renders posts with published / draft status and category', async ({ page }) => {
    await openList(page)
    await expect(page.locator('tr', { hasText: 'How funding works' }).getByText('Published')).toBeVisible()
    await expect(page.locator('tr', { hasText: 'Draft about credit' }).getByText('Draft', { exact: true })).toBeVisible()
    await expect(page.locator('tr', { hasText: 'Draft about credit' }).getByText('Uncategorized')).toBeVisible()
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder(/Search blogs/).fill('credit')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => api.find('POST', `${CMS}/blogs/fetch`).at(-1)?.json.search).toBe('credit')
  })

  test('Clear resets the search', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder(/Search blogs/).fill('credit')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => api.find('POST', `${CMS}/blogs/fetch`).at(-1)?.json.search).toBe('credit')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(page.getByPlaceholder(/Search blogs/)).toHaveValue('')
    await expect.poll(() => api.find('POST', `${CMS}/blogs/fetch`).at(-1)?.json.search).toBe('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: BLOG_PERMS })
    await mockApi(page, [{ method: 'POST', match: `${CMS}/blogs/fetch`, body: paginated([]) }])
    await page.goto('/cms/blogs')
    await expect(page.getByText('No blog posts found matching your criteria.')).toBeVisible()
  })

  test('the view action links to the public post', async ({ page }) => {
    await openList(page)
    const link = page.locator('tr', { hasText: 'How funding works' }).getByTitle('View')
    await expect(link).toHaveAttribute('href', /\/blog\/how-funding-works$/)
    await expect(link).toHaveAttribute('target', '_blank')
  })

  test('Add Post needs the create permission', async ({ page }) => {
    await openList(page, ['view blogs'])
    await expect(page.getByRole('button', { name: /add post/i })).toHaveCount(0)
  })

  test('Add Post opens the editor', async ({ page }) => {
    await openList(page)
    await page.getByRole('button', { name: /add post/i }).click()
    await expect(page).toHaveURL(/\/cms\/blogs\/create/)
  })

  test('clicking a row opens the editor only with the update permission', async ({ page }) => {
    await openList(page, ['view blogs'])
    await page.getByText('how-funding-works').click()
    await expect(page).toHaveURL(/\/cms\/blogs$/)
  })

  test('clicking a row opens the editor for an editor', async ({ page }) => {
    await openList(page)
    await page.getByText('how-funding-works').click()
    await expect(page).toHaveURL(/\/cms\/blogs\/edit\/91/)
  })

  test('Delete Selected deletes after confirmation', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'POST', match: `${CMS}/blogs-multiple-delete`, body: ok(null) })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    const call = await expectCall(api, 'POST', `${CMS}/blogs-multiple-delete`)
    expect(call.json).toEqual({ ids: [91] })
    await expect(page.getByText('Blogs deleted successfully')).toBeVisible()
  })

  test('closing the confirmation cancels the delete', async ({ page }) => {
    const api = await openList(page)
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await cancelDelete(page)
    expect(api.find('POST', `${CMS}/blogs-multiple-delete`)).toHaveLength(0)
  })

  test('a failed delete is reported', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'POST', match: `${CMS}/blogs-multiple-delete`, status: 500, body: failure('boom') })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Failed to delete blogs')).toBeVisible()
  })
})

test.describe('Blog editor', () => {
  async function openCreate(page: Page) {
    await seedSession(page, { permissions: BLOG_PERMS })
    const api = await mockApi(page, blogHandlers())
    await page.goto('/cms/blogs/create')
    await expect(page.getByPlaceholder('Enter post title')).toBeVisible()
    return api
  }

  test('server validation errors are shown under the fields', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: new RegExp(`${CMS}/blogs$`), status: 422,
      body: laravelFailure({ title: ['The title field is required.'], content: ['The content field is required.'], category_id: ['Please pick a category.'] }),
    })
    await page.locator('button[form="blog-form"]').click()
    await expect(page.getByText('The title field is required.')).toBeVisible()
    await expect(page.getByText('The content field is required.')).toBeVisible()
    await expect(page.getByText('Please pick a category.')).toBeVisible()
    await expect(page).toHaveURL(/\/cms\/blogs\/create/)
  })

  test('a post is submitted as multipart and the list opens', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: new RegExp(`${CMS}/blogs$`), body: ok({ id: 100 }) })
    await page.getByPlaceholder('Enter post title').fill('Fresh post')
    await page.getByPlaceholder(/Write a brief summary/).fill('A short summary')
    await page.locator('button[form="blog-form"]').click()
    const call = await expectCall(api, 'POST', new RegExp(`${CMS}/blogs$`))
    expect(call.json).toMatchObject({ title: 'Fresh post', summary: 'A short summary' })
    await expect(page.getByText('Blog created successfully')).toBeVisible()
    await expect(page).toHaveURL(/\/cms\/blogs$/)
  })

  // BUG-045: the API makes a new post's address from its title, unique (title-2, …).
  test('a new post is sent without a slug of its own', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: new RegExp(`${CMS}/blogs$`), body: ok({ id: 101, slug: 'fresh-post-2' }) })
    await page.getByPlaceholder('Enter post title').fill('Fresh post')
    await page.locator('button[form="blog-form"]').click()
    const call = await expectCall(api, 'POST', new RegExp(`${CMS}/blogs$`))
    expect(call.json).toMatchObject({ title: 'Fresh post' })
    expect(call.json).not.toHaveProperty('slug')
    await expect(page.getByText('Blog created successfully')).toBeVisible()
  })

  // BUG-045: a taken address used to fail silently - no slug field to show it on.
  test('a taken web address is shown under the title, not swallowed', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: new RegExp(`${CMS}/blogs$`), status: 422,
      body: laravelFailure({ slug: ['The slug has already been taken.'] }),
    })
    await page.getByPlaceholder('Enter post title').fill('QA Draft Post')
    await page.locator('button[form="blog-form"]').click()
    await expect(page.getByText(/another post already uses this title's web address/i)).toBeVisible()
    await expect(page.getByPlaceholder('Enter post title')).toHaveClass(/is-invalid/)
    await expect(page).toHaveURL(/\/cms\/blogs\/create/)
  })

  test('a refusal on a field the form does not show is toasted', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: new RegExp(`${CMS}/blogs$`), status: 422,
      body: laravelFailure({ og_title: ['The og title may not be greater than 255 characters.'] }),
    })
    await page.getByPlaceholder('Enter post title').fill('Fresh post')
    await page.locator('button[form="blog-form"]').click()
    await expect(page.getByText('The og title may not be greater than 255 characters.').first()).toBeVisible()
  })

  test('a general failure is toasted', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: new RegExp(`${CMS}/blogs$`), status: 500, body: failure('Blog storage is full.') })
    await page.locator('button[form="blog-form"]').click()
    await expect(page.getByText('Blog storage is full.').first()).toBeVisible()
  })

  test('the create route is blocked without the create permission', async ({ page }) => {
    await seedSession(page, { permissions: ['view blogs'] })
    await mockApi(page, blogHandlers())
    await page.goto('/cms/blogs/create')
    await expect(page).toHaveURL(/access-denied/)
  })

  test('the edit route is blocked without the update permission', async ({ page }) => {
    await seedSession(page, { permissions: ['view blogs'] })
    await mockApi(page, blogHandlers())
    await page.goto('/cms/blogs/edit/91')
    await expect(page).toHaveURL(/access-denied/)
  })

  test('editing loads the post and Update posts to its id', async ({ page }) => {
    await seedSession(page, { permissions: BLOG_PERMS })
    const api = await mockApi(page, [
      ...blogHandlers(),
      { method: 'GET', match: `${CMS}/blogs/91`, body: ok({ ...BLOGS[0], summary: 'Old summary', content: '<p>Body</p>', category_id: 1, tags: [] }) },
    ])
    api.add({ method: 'POST', match: new RegExp(`${CMS}/blogs/91$`), body: ok(BLOGS[0]) })
    await page.goto('/cms/blogs/edit/91')
    await expect(page.getByPlaceholder('Enter post title')).toHaveValue('How funding works')
    await page.getByPlaceholder('Enter post title').fill('How funding really works')
    await page.locator('button[form="blog-form"]').click()
    const call = await expectCall(api, 'POST', new RegExp(`${CMS}/blogs/91$`))
    expect(call.json).toMatchObject({ title: 'How funding really works' })
    await expect(page.getByText('Blog updated successfully')).toBeVisible()
  })
})
