import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'

vi.mock('../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))
vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import UserDetails from '../../../src/pages/users/UserDetails'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

const SAM = { id: 7, name: 'Sam Sales', email: 'sam@example.com', phone_number: '5551234567', role_id: 3, status: 'active' }

let pending: string | null
let sent: Array<Record<string, unknown>>

function mockApi() {
  sent = []
  server.use(
    http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: {} })),
    http.post('*/common/roles/fetch-roles', () => HttpResponse.json({ status: true, data: [{ id: 3, name: 'Sales' }] })),
    http.get('*/common/users/7', () => HttpResponse.json({ status: true, data: { ...SAM, pending_email: pending } })),
    http.put('*/common/users/7', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      sent.push(body)
      // The API: the current email withdraws a pending change, the pending one keeps it.
      if (body.email === SAM.email) pending = null
      return HttpResponse.json({ status: true, data: { ...SAM, pending_email: pending } })
    }),
    http.post('*/common/email-change/cancel', () => {
      pending = null
      return HttpResponse.json({ status: true, message: 'The pending email change has been cancelled.', data: { pending_email: null } })
    })
  )
}

const mount = () =>
  renderWithProviders(
    <Routes>
      <Route path="/users/:id" element={<UserDetails />} />
    </Routes>,
    { route: '/users/7' }
  )

const emailField = () => screen.getByPlaceholderText('Enter email address')

/**
 * BUG-203: while a change waits, the email field shows the pending email and
 * the notice names the current one. Saving other fields keeps the change;
 * typing the current email back in withdraws it.
 */
describe('UserDetails - a pending email change', () => {
  beforeEach(() => {
    reset()
    pending = 'sam.new@example.com'
    mockApi()
    useAuthStore.setState({ token: 't', user: { id: 1, is_host: 1, entity_type: 'Partner', permissions: ['view users', 'update users'] } as never })
  })
  afterEach(reset)

  it('shows the pending email in the field and the current one in the notice', async () => {
    mount()

    await waitFor(() => expect(emailField()).toHaveValue('sam.new@example.com'))
    const notice = screen.getByText(/Waiting for confirmation from/)
    expect(notice).toHaveTextContent('sam.new@example.com')
    expect(notice).toHaveTextContent('Sign-in stays sam@example.com')
  })

  it('saving without touching the email sends the pending one back, so the change stays', async () => {
    const user = userEvent.setup()
    mount()
    await waitFor(() => expect(emailField()).toHaveValue('sam.new@example.com'))

    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0].email).toBe('sam.new@example.com')
    expect(emailField()).toHaveValue('sam.new@example.com')
    expect(screen.getByText(/Waiting for confirmation from/)).toBeInTheDocument()
  })

  it('typing the current email back in withdraws the change', async () => {
    const user = userEvent.setup()
    mount()
    await waitFor(() => expect(emailField()).toHaveValue('sam.new@example.com'))

    await user.clear(emailField())
    await user.type(emailField(), 'sam@example.com')
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0].email).toBe('sam@example.com')
    await waitFor(() => expect(screen.queryByText(/Waiting for confirmation from/)).not.toBeInTheDocument())
    expect(emailField()).toHaveValue('sam@example.com')
  })

  it('Cancel change puts the current email back in the field', async () => {
    const user = userEvent.setup()
    mount()
    await waitFor(() => expect(emailField()).toHaveValue('sam.new@example.com'))

    await user.click(screen.getByRole('button', { name: 'Cancel change' }))

    await waitFor(() => expect(screen.queryByText(/Waiting for confirmation from/)).not.toBeInTheDocument())
    expect(emailField()).toHaveValue('sam@example.com')
  })
})
