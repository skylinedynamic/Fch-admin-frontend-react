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

import ClientDetails from '../../../src/pages/clients/ClientDetails'

const BO = { id: 136, user_id: 55, first_name: 'Bo', last_name: 'Rower', email: 'bo@example.test', has_sign: false }

let pending: string | null
let sentEmails: string[]

/**
 * BUG-203: while a change waits, the client's email field shows the pending
 * email and the notice names the current one. Saving other fields keeps the
 * change; typing the current email back in withdraws it.
 */
describe('ClientDetails - a pending email change', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pending = 'bo.new@example.test'
    sentEmails = []
    signIn({ is_host: 1, permissions: ['view clients', 'update clients'] })
    allowBackgroundCalls()
    api('get', '/common/borrowers/136', { status: true, message: 'ok', data: { ...BO, pending_email: pending } })
    server.use(
      http.post('*/common/borrowers/136', async ({ request }) => {
        const email = String(((await request.json()) as { email: string }).email)
        sentEmails.push(email)
        // The API: the current email withdraws a pending change, the pending one keeps it.
        if (email === BO.email) pending = null
        return HttpResponse.json({ status: true, message: 'ok', data: { ...BO, pending_email: pending } })
      }),
      http.post('*/common/email-change/cancel', () => {
        pending = null
        return HttpResponse.json({ status: true, message: 'The pending email change has been cancelled.', data: { pending_email: null } })
      })
    )
  })

  const mount = () => renderPage(<ClientDetails />, { path: '/clients/:id', route: '/clients/136' })
  const emailField = () => screen.getByPlaceholderText('Enter email address')

  it('shows the pending email in the field and the current one in the notice', async () => {
    mount()

    await waitFor(() => expect(emailField()).toHaveValue('bo.new@example.test'))
    const notice = screen.getByText(/Waiting for confirmation from/)
    expect(notice).toHaveTextContent('bo.new@example.test')
    expect(notice).toHaveTextContent('Sign-in stays bo@example.test')
  })

  it('saving without touching the email sends the pending one back, so the change stays', async () => {
    const user = userEvent.setup()
    mount()
    await waitFor(() => expect(emailField()).toHaveValue('bo.new@example.test'))

    await user.click(screen.getByRole('button', { name: /^update$/i }))

    await waitFor(() => expect(sentEmails).toEqual(['bo.new@example.test']))
    await waitFor(() => expect(emailField()).toHaveValue('bo.new@example.test'))
    expect(screen.getByText(/Waiting for confirmation from/)).toBeInTheDocument()
  })

  it('typing the current email back in withdraws the change', async () => {
    const user = userEvent.setup()
    mount()
    await waitFor(() => expect(emailField()).toHaveValue('bo.new@example.test'))

    await user.clear(emailField())
    await user.type(emailField(), 'bo@example.test')
    await user.click(screen.getByRole('button', { name: /^update$/i }))

    await waitFor(() => expect(sentEmails).toEqual(['bo@example.test']))
    await waitFor(() => expect(screen.queryByText(/Waiting for confirmation from/)).not.toBeInTheDocument())
    expect(emailField()).toHaveValue('bo@example.test')
  })

  it('Cancel change puts the current email back in the field', async () => {
    const user = userEvent.setup()
    mount()
    await waitFor(() => expect(emailField()).toHaveValue('bo.new@example.test'))

    await user.click(screen.getByRole('button', { name: 'Cancel change' }))

    await waitFor(() => expect(screen.queryByText(/Waiting for confirmation from/)).not.toBeInTheDocument())
    expect(emailField()).toHaveValue('bo@example.test')
  })
})
