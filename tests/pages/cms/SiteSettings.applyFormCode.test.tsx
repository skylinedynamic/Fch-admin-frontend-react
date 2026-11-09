import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, invalid, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import { toast } from 'react-toastify'
import SiteSettings from '../../../src/pages/cms/SiteSettings'

/**
 * The website's /apply page shows the host's application form the way a
 * partner's site would: the embed code copied from Embed Form Settings is
 * pasted here. The API checks it; its refusal shows under the field.
 */
const CODE = '<iframe src="https://fourcornerfunding.com/form/pk_1?header=0" data-fch-embed height="800"></iframe>'

const mount = (stored: string | null = null) => {
  signIn({ permissions: ['view site settings', 'update site settings'] })
  allowBackgroundCalls()
  api('get', '/admin/cms/site-settings', { status: true, data: { site_name: 'FCH', apply_form_embed_code: stored } })
  renderPage(<SiteSettings />, { path: '/cms/site-settings' })
}

const field = () => screen.getByLabelText(/apply page form code/i) as HTMLTextAreaElement

describe('SiteSettings - Apply page form code', () => {
  it('shows the code already saved', async () => {
    mount(CODE)

    await waitFor(() => expect(field()).toHaveValue(CODE))
    expect(screen.getByText(/copy embed html/i)).toBeInTheDocument()
  })

  // SCRUM-435 S435-BUG-03: the help promised a default form for an empty field,
  // but with no valid code /apply shows no form at all.
  it('says that without a code the Apply page shows no form', async () => {
    mount()

    await waitFor(() => expect(field()).toBeInTheDocument())
    expect(screen.getByText(/the apply page shows no application form/i)).toBeInTheDocument()
    expect(screen.getByText(/regenerating the form's key has the same effect/i)).toBeInTheDocument()
    expect(screen.queryByText(/leave empty for the default/i)).not.toBeInTheDocument()
  })

  it('sends the pasted code with the settings', async () => {
    mount()
    const save = api('post', '/admin/cms/site-settings', { status: true, message: 'Saved', data: {} })
    await waitFor(() => expect(field()).toBeInTheDocument())

    fireEvent.change(field(), { target: { value: CODE } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect((save.bodies[0] as Record<string, unknown>).apply_form_embed_code).toBe(CODE)
  })

  it('shows the API refusal under the field, not in a toast', async () => {
    mount()
    const message = 'This code is not for the current application form. Copy it again from Embed Form Settings.'
    api('post', '/admin/cms/site-settings', invalid({ apply_form_embed_code: message }), 422)
    await waitFor(() => expect(field()).toBeInTheDocument())

    fireEvent.change(field(), { target: { value: CODE } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(field()).toHaveClass('is-invalid')
    expect(toast.error).not.toHaveBeenCalled()
  })
})
