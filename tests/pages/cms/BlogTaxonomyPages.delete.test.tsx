import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { toast } from 'react-toastify'
import BlogCategories from '../../../src/pages/cms/BlogCategories'
import BlogTags from '../../../src/pages/cms/BlogTags'

/** BUG-059: the Categories and Tags pages deleted through the browser's own confirm pop-up. */
const cases = [
  { title: 'Blog Categories', Page: BlogCategories, list: '/admin/cms/blog-categories', destroy: '/admin/cms/blog-categories-multiple-delete', kind: 'Category', deleted: 'Category deleted successfully' },
  { title: 'Blog Tags', Page: BlogTags, list: '/admin/cms/blog-tags', destroy: '/admin/cms/blog-tags-multiple-delete', kind: 'Tag', deleted: 'Tag deleted successfully' },
]

describe.each(cases)('$title - delete', (c) => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn({ permissions: ['view cms', 'delete cms'] })
    allowBackgroundCalls()
    api('get', c.list, { status: true, data: [{ id: 3, name: 'QA-TEST Name', slug: 'qa-test-name', blogs_count: 0 }, { id: 4, name: 'In Use', slug: 'in-use', blogs_count: 3 }] })
  })

  it('asks in the app confirm dialog, then deletes', async () => {
    const browserConfirm = vi.spyOn(window, 'confirm')
    const remove = api('post', c.destroy, { status: true })
    const user = userEvent.setup()
    const { container } = renderPage(<c.Page />, { path: '/cms/x' })
    await screen.findByText('QA-TEST Name')

    await user.click(container.querySelectorAll('.btn-soft-danger')[0] as HTMLElement)

    expect(browserConfirm).not.toHaveBeenCalled()
    expect(await screen.findByText(`Delete ${c.kind}?`, { selector: 'h4' })).toBeInTheDocument()
    expect(screen.getByText(`This will permanently remove the ${c.kind.toLowerCase()} "QA-TEST Name".`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Yes, Delete It', hidden: true }))

    await waitFor(() => expect(remove.bodies[0]).toEqual({ ids: [3] }))
    expect(toast.success).toHaveBeenCalledWith(c.deleted)
  })
  it('says why instead of deleting one used by blog posts', async () => {
    const remove = api('post', c.destroy, { status: true })
    const user = userEvent.setup()
    const { container } = renderPage(<c.Page />, { path: '/cms/x' })
    await screen.findByText('In Use')

    await user.click(container.querySelectorAll('.btn-soft-danger')[1] as HTMLElement)

    expect(await screen.findByText(`${c.kind} Cannot Be Deleted`)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`^"In Use" is used by 3 blog posts and cannot be deleted\.`))).toBeInTheDocument()
    expect(remove.calls).toBe(0)
  })

  it('shows the same message when the API refuses the delete', async () => {
    api('post', c.destroy, { status: false, message: 'in use', errors: { blocked: [{ id: 3, name: 'QA-TEST Name' }] } }, 422)
    const user = userEvent.setup()
    const { container } = renderPage(<c.Page />, { path: '/cms/x' })
    await screen.findByText('QA-TEST Name')

    await user.click(container.querySelectorAll('.btn-soft-danger')[0] as HTMLElement)
    await user.click(await screen.findByRole('button', { name: 'Yes, Delete It', hidden: true }))

    expect(await screen.findByText(`${c.kind} Cannot Be Deleted`)).toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })
})
