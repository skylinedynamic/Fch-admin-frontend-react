import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import PartnerProfile from '../../../src/pages/partners/PartnerProfile'

const ACME = {
  id: 86,
  full_name: 'Acme Owner',
  company_name: 'Acme LLC',
  email: 'acme@example.test',
  login_user_id: 41,
  partner_type: 'White Label Partner',
  status: 'Active',
  assigned_user_id: '',
  country: 'United States',
  is_host: 0,
}

let pending: string | null
let sentEmails: string[]

/**
 * BUG-203: while a change waits, the partner's email field shows the pending
 * email and the notice names the current one. Saving other fields keeps the
 * change; typing the current email back in withdraws it.
 */
describe('PartnerProfile - a pending email change', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pending = 'acme.new@example.test'
    sentEmails = []
    signIn({ permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    api('get', '/admin/partners/86/status-agent', { status: true, message: 'ok', data: { id: 86, status: 'Active', assign_to: null, agent: null } })
    server.use(
      http.get('*/admin/partners-details/86', () => HttpResponse.json({ status: true, message: 'ok', data: { ...ACME, pending_email: pending } })),
      http.post('*/admin/partners/86', async ({ request }) => {
        const email = String((await request.formData()).get('email'))
        sentEmails.push(email)
        // The API: the current email withdraws a pending change, the pending one keeps it.
        if (email === ACME.email) pending = null
        return HttpResponse.json({ status: true, message: 'ok', data: { ...ACME, pending_email: pending } })
      }),
      http.post('*/common/email-change/cancel', () => {
        pending = null
        return HttpResponse.json({ status: true, message: 'The pending email change has been cancelled.', data: { pending_email: null } })
      })
    )
  })

  // The page opens on Status & Agent; the email is on Partner information.
  const mount = async () => {
    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/86' })
    await userEvent.click(await screen.findByText('Partner information'))
  }
  const emailField = () => screen.getByPlaceholderText('Enter email address')
  const update = () => screen.getAllByRole('button', { name: /^update$/i })[0]

  it('shows the pending email in the field and the current one in the notice', async () => {
    await mount()

    await waitFor(() => expect(emailField()).toHaveValue('acme.new@example.test'))
    const notice = screen.getByText(/Waiting for confirmation from/)
    expect(notice).toHaveTextContent('acme.new@example.test')
    expect(notice).toHaveTextContent('Sign-in stays acme@example.test')
  })

  it('saving without touching the email sends the pending one back, so the change stays', async () => {
    const user = userEvent.setup()
    await mount()
    await waitFor(() => expect(emailField()).toHaveValue('acme.new@example.test'))

    await user.click(update())

    await waitFor(() => expect(sentEmails).toEqual(['acme.new@example.test']))
    await waitFor(() => expect(emailField()).toHaveValue('acme.new@example.test'))
    expect(screen.getByText(/Waiting for confirmation from/)).toBeInTheDocument()
  })

  it('typing the current email back in withdraws the change', async () => {
    const user = userEvent.setup()
    await mount()
    await waitFor(() => expect(emailField()).toHaveValue('acme.new@example.test'))

    await user.clear(emailField())
    await user.type(emailField(), 'acme@example.test')
    await user.click(update())

    await waitFor(() => expect(sentEmails).toEqual(['acme@example.test']))
    await waitFor(() => expect(screen.queryByText(/Waiting for confirmation from/)).not.toBeInTheDocument())
    expect(emailField()).toHaveValue('acme@example.test')
  })

  it('Cancel change puts the current email back in the field', async () => {
    const user = userEvent.setup()
    await mount()
    await waitFor(() => expect(emailField()).toHaveValue('acme.new@example.test'))

    await user.click(screen.getByRole('button', { name: 'Cancel change' }))

    await waitFor(() => expect(screen.queryByText(/Waiting for confirmation from/)).not.toBeInTheDocument())
    expect(emailField()).toHaveValue('acme@example.test')
  })
})
