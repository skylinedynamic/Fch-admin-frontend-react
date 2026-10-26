import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor, within } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// The rich-text editor does not run under jsdom; nothing here edits post content.
vi.mock('@ckeditor/ckeditor5-react', () => ({ CKEditor: () => null }))
vi.mock('ckeditor5', () => ({ ClassicEditor: {} }))
vi.mock('../../../src/config/ckeditorConfig', () => ({ editorConfig: {} }))

import { toast } from 'react-toastify'
import BlogEdit from '../../../src/pages/cms/BlogEdit'

/**
 * Defect (BUG-059): in CMS > Blogs > Create, Category/Tag "Add New" -
 *  - the same name could be added again ("Category added" every time);
 *  - the chips had only an x (delete), no way to rename;
 *  - x opened the browser's own confirm pop-up instead of the app's dialog.
 * The API refuses a duplicate name; the page shows its message, each chip can
 * be renamed in place, and delete goes through the app's confirm dialog.
 */
const CATEGORIES = [{ id: 1, name: 'Finance & Funding', blogs_count: 2 }, { id: 2, name: 'Tax & Underwriting', blogs_count: 0 }]
const TAGS = [{ id: 5, name: 'SBA', blogs_count: 0 }, { id: 7, name: 'Loans', blogs_count: 1 }]

const dialog = (title: string) => screen.getByText(title).closest('.p-dialog') as HTMLElement

beforeEach(() => {
  vi.clearAllMocks()
  signIn({ permissions: ['view cms', 'create cms', 'update cms', 'delete cms'] })
  allowBackgroundCalls()
  api('get', '/admin/cms/blog-categories', { status: true, data: CATEGORIES })
  api('get', '/admin/cms/blog-tags', { status: true, data: TAGS })
})

const openCategoryDialog = async () => {
  const user = userEvent.setup()
  renderPage(<BlogEdit />, { path: '/cms/blogs/create' })
  await user.click((await screen.findAllByRole('button', { name: /add new/i }))[0])
  await screen.findByText('Finance & Funding', { selector: '.p-dialog .badge' })
  return user
}

describe('BlogEdit - categories and tags', () => {
  it('says "Category added successfully" when a new category is added', async () => {
    const create = api('post', '/admin/cms/blog-categories', { status: true, data: { id: 9, name: 'QA-TEST Category' } }, 201)
    const user = await openCategoryDialog()

    await user.type(screen.getByPlaceholderText('Enter category name'), 'QA-TEST Category')
    await user.click(within(dialog('Add New Category')).getByRole('button', { name: /submit/i }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Category added successfully'))
    expect(create.bodies[0]).toEqual({ name: 'QA-TEST Category' })
  })

  it('shows the API message when the category name already exists', async () => {
    api('post', '/admin/cms/blog-categories', { message: 'A category with this name already exists.', errors: { name: ['A category with this name already exists.'] } }, 422)
    const user = await openCategoryDialog()

    await user.type(screen.getByPlaceholderText('Enter category name'), 'Finance & Funding')
    await user.click(within(dialog('Add New Category')).getByRole('button', { name: /submit/i }))

    expect(await screen.findByText('A category with this name already exists.')).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('renames a category in place and says it was updated', async () => {
    const update = api('post', '/admin/cms/blog-categories/2', { status: true, data: { id: 2, name: 'Tax Planning' } })
    const user = await openCategoryDialog()

    await user.click(screen.getByRole('button', { name: 'Edit Tax & Underwriting' }))
    const input = screen.getByRole('textbox', { name: 'Category name' })
    await user.clear(input)
    await user.type(input, 'Tax Planning{Enter}')

    await waitFor(() => expect(update.bodies[0]).toEqual({ name: 'Tax Planning' }))
    expect(toast.success).toHaveBeenCalledWith('Category updated successfully')
  })

  it('shows the duplicate-name message under the chip being renamed', async () => {
    api('post', '/admin/cms/blog-categories/2', { message: 'A category with this name already exists.', errors: { name: ['A category with this name already exists.'] } }, 422)
    const user = await openCategoryDialog()

    await user.click(screen.getByRole('button', { name: 'Edit Tax & Underwriting' }))
    const input = screen.getByRole('textbox', { name: 'Category name' })
    await user.clear(input)
    await user.type(input, 'Finance & Funding{Enter}')

    expect(await screen.findByText('A category with this name already exists.')).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('deletes through the app confirm dialog, not the browser pop-up', async () => {
    const browserConfirm = vi.spyOn(window, 'confirm')
    const remove = api('post', '/admin/cms/blog-categories-multiple-delete', { status: true })
    const user = await openCategoryDialog()

    await user.click(screen.getByRole('button', { name: 'Delete Tax & Underwriting' }))

    expect(browserConfirm).not.toHaveBeenCalled()
    expect(await screen.findByText('Delete Category?', { selector: 'h4' })).toBeInTheDocument()
    expect(screen.getByText('This will permanently remove the category "Tax & Underwriting".')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Yes, Delete It', hidden: true }))

    await waitFor(() => expect(remove.bodies[0]).toEqual({ ids: [2] }))
    expect(toast.success).toHaveBeenCalledWith('Category deleted successfully')
  })

  it('tags work the same way: added, renamed and deleted with full messages', async () => {
    api('post', '/admin/cms/blog-tags', { status: true, data: { id: 6, name: 'QA-TEST Tag' } }, 201)
    const update = api('post', '/admin/cms/blog-tags/5', { status: true, data: { id: 5, name: 'SBA Loans' } })
    const remove = api('post', '/admin/cms/blog-tags-multiple-delete', { status: true })
    const browserConfirm = vi.spyOn(window, 'confirm')
    const user = userEvent.setup()
    renderPage(<BlogEdit />, { path: '/cms/blogs/create' })
    await user.click((await screen.findAllByRole('button', { name: /add new/i }))[1])
    await screen.findByText('SBA', { selector: '.p-dialog .badge' })

    await user.type(screen.getByPlaceholderText('Enter tag name'), 'QA-TEST Tag')
    await user.click(within(dialog('Add New Tag')).getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Tag added successfully'))

    await user.click((await screen.findAllByRole('button', { name: /add new/i }))[1])
    await user.click(await screen.findByRole('button', { name: 'Edit SBA' }))
    const input = screen.getByRole('textbox', { name: 'Tag name' })
    await user.clear(input)
    await user.type(input, 'SBA Loans{Enter}')
    await waitFor(() => expect(update.bodies[0]).toEqual({ name: 'SBA Loans' }))
    expect(toast.success).toHaveBeenCalledWith('Tag updated successfully')

    await user.click(await screen.findByRole('button', { name: /^Delete SBA/ }))
    expect(browserConfirm).not.toHaveBeenCalled()
    await user.click(await screen.findByRole('button', { name: 'Yes, Delete It', hidden: true }))
    await waitFor(() => expect(remove.bodies[0]).toEqual({ ids: [5] }))
    expect(toast.success).toHaveBeenCalledWith('Tag deleted successfully')
  })
  it('does not offer to delete a category used by blog posts - it says why instead', async () => {
    const remove = api('post', '/admin/cms/blog-categories-multiple-delete', { status: true })
    const user = await openCategoryDialog()

    await user.click(screen.getByRole('button', { name: 'Delete Finance & Funding' }))

    expect(await screen.findByText('Category Cannot Be Deleted')).toBeInTheDocument()
    expect(screen.getByText('"Finance & Funding" is used by 2 blog posts and cannot be deleted. Move those posts to another category first.')).toBeInTheDocument()
    expect(screen.queryByText(/This will permanently remove the category/)).not.toBeInTheDocument()
    expect(remove.calls).toBe(0)
  })

  it('shows the same message when the API refuses the delete', async () => {
    api('post', '/admin/cms/blog-categories-multiple-delete', { status: false, message: 'This category is used by a blog post and cannot be deleted.', errors: { blocked: [{ id: 2, name: 'Tax & Underwriting' }] } }, 422)
    const user = await openCategoryDialog()

    await user.click(screen.getByRole('button', { name: 'Delete Tax & Underwriting' }))
    await user.click(await screen.findByRole('button', { name: 'Yes, Delete It', hidden: true }))

    expect(await screen.findByText('Category Cannot Be Deleted')).toBeInTheDocument()
    expect(screen.getByText('"Tax & Underwriting" is used by a blog post and cannot be deleted. Move those posts to another category first.')).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('does not offer to delete a tag used by a blog post', async () => {
    const remove = api('post', '/admin/cms/blog-tags-multiple-delete', { status: true })
    const user = userEvent.setup()
    renderPage(<BlogEdit />, { path: '/cms/blogs/create' })
    await user.click((await screen.findAllByRole('button', { name: /add new/i }))[1])
    await user.click(await screen.findByRole('button', { name: 'Delete Loans' }))

    expect(await screen.findByText('Tag Cannot Be Deleted')).toBeInTheDocument()
    expect(screen.getByText('"Loans" is used by 1 blog post and cannot be deleted. Remove it from those posts first.')).toBeInTheDocument()
    expect(remove.calls).toBe(0)
  })
})
