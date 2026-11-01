import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
// CKEditor needs a real browser; a textarea stands in for the content editor.
vi.mock('@ckeditor/ckeditor5-react', () => ({
  CKEditor: ({ data, onChange }: { data: string; onChange: (e: unknown, editor: { getData: () => string }) => void }) => (
    <textarea aria-label="Content" defaultValue={data} onChange={(e) => onChange(e, { getData: () => e.target.value })} />
  ),
}))
vi.mock('ckeditor5', () => ({ ClassicEditor: {} }))
vi.mock('ckeditor5/ckeditor5.css', () => ({}))
vi.mock('../../../src/config/ckeditorConfig', () => ({ editorConfig: {} }))

import { toast } from 'react-toastify'
import BlogEdit from '../../../src/pages/cms/BlogEdit'

/**
 * BUG-045: a post whose title another post already has failed silently - the
 * form sent a slug made from the title, the API refused it (422 on `slug`),
 * and the form had nowhere to show a slug error, so nothing appeared.
 */
beforeEach(() => {
  vi.clearAllMocks()
  signIn({ permissions: ['view blogs', 'create blogs', 'update blogs'] })
  allowBackgroundCalls()
})

const fillAndPublish = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(await screen.findByPlaceholderText('Enter post title'), 'QA Draft Post')
  await user.type(screen.getByLabelText('Content'), 'Body')
  await user.click(screen.getByRole('button', { name: /publish/i }))
}

/** A 422 as BlogRequest (Laravel's FormRequest) sends it: a list of messages per field. */
const invalid = (errors: Record<string, string>) => ({
  message: Object.values(errors)[0],
  errors: Object.fromEntries(Object.entries(errors).map(([field, message]) => [field, [message]])),
})

/** A multipart field's value, or null when it was not sent. */
const field = (body: unknown, name: string) => (body instanceof FormData ? body.get(name) : (body as Record<string, unknown>)?.[name] ?? null)

describe('BlogEdit - saving a new post', () => {
  it('does not send a slug of its own - the API makes a unique one from the title', async () => {
    const save = api('post', '/admin/cms/blogs', { status: true, data: { id: 9 } }, 201)
    const user = userEvent.setup()
    renderPage(<BlogEdit />, { path: '/cms/blogs/create', route: '/cms/blogs/create' })

    await fillAndPublish(user)

    await waitFor(() => expect(save.calls).toBe(1))
    expect(field(save.bodies[0], 'title')).toBe('QA Draft Post')
    expect(field(save.bodies[0], 'slug')).toBeNull()
  })

  it('shows a taken web address under the title instead of failing silently', async () => {
    api('post', '/admin/cms/blogs', invalid({ slug: 'The slug has already been taken.' }), 422)
    const user = userEvent.setup()
    renderPage(<BlogEdit />, { path: '/cms/blogs/create', route: '/cms/blogs/create' })

    await fillAndPublish(user)

    expect(await screen.findByText(/another post already uses this title's web address/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter post title')).toHaveClass('is-invalid')
  })

  it('a refusal on a field the form does not show is toasted, never silent', async () => {
    api('post', '/admin/cms/blogs', invalid({ og_title: 'The og title may not be greater than 255 characters.' }), 422)
    const user = userEvent.setup()
    renderPage(<BlogEdit />, { path: '/cms/blogs/create', route: '/cms/blogs/create' })

    await fillAndPublish(user)

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('The og title may not be greater than 255 characters.'))
  })
})
