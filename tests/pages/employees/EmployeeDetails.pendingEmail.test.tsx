import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

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

import EmployeeDetails from '../../../src/pages/employees/EmployeeDetails'

const EVE = { id: 9, first_name: 'Eve', last_name: 'Employee', email: 'eve@example.com' }

let pending: string | null
let sentEmails: string[]

const employeeData = () => ({ ...EVE, user: { id: 41, role_id: 3, pending_email: pending } })

/**
 * BUG-203: while a change waits, the email field shows the pending email and
 * the notice names the current one. Saving other fields keeps the change;
 * typing the current email back in withdraws it.
 */
describe('EmployeeDetails - a pending email change', () => {
  beforeEach(() => {
    pending = 'eve.new@example.com'
    sentEmails = []
    server.use(
      http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: {} })),
      http.post('*/common/roles/fetch-roles', () => HttpResponse.json({ status: true, data: [] })),
      http.post('*/common/departments/fetch-departments', () => HttpResponse.json({ status: true, data: [] })),
      http.get('*/common/employees/9', () => HttpResponse.json({ status: true, data: employeeData() })),
      http.post('*/common/employees/9', async ({ request }) => {
        const email = String((await request.formData()).get('email'))
        sentEmails.push(email)
        // The API: the current email withdraws a pending change, the pending one keeps it.
        if (email === EVE.email) pending = null
        return HttpResponse.json({ status: true, data: { employee: EVE, user: { id: 41, pending_email: pending } } })
      }),
      http.post('*/common/email-change/cancel', () => {
        pending = null
        return HttpResponse.json({ status: true, message: 'The pending email change has been cancelled.', data: { pending_email: null } })
      }),
      http.all('*', () => HttpResponse.json({ status: true, data: [] }))
    )
    useAuthStore.setState({
      token: 't',
      user: { id: 1, is_host: 1, entity_type: 'Partner', permissions: ['view employees', 'update employees'] } as never,
    })
  })

  afterEach(() => {
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })
  })

  const mount = () =>
    renderWithProviders(
      <Routes>
        <Route path="/employees/:id" element={<EmployeeDetails />} />
      </Routes>,
      { route: '/employees/9' }
    )

  const emailField = () => screen.getByPlaceholderText('Enter email')

  it('shows the pending email in the field and the current one in the notice', async () => {
    mount()

    await waitFor(() => expect(emailField()).toHaveValue('eve.new@example.com'))
    const notice = screen.getByText(/Waiting for confirmation from/)
    expect(notice).toHaveTextContent('eve.new@example.com')
    expect(notice).toHaveTextContent('Sign-in stays eve@example.com')
  })

  it('saving without touching the email sends the pending one back, so the change stays', async () => {
    const user = userEvent.setup()
    mount()
    await waitFor(() => expect(emailField()).toHaveValue('eve.new@example.com'))

    await user.click(screen.getByRole('button', { name: /^update$/i }))

    await waitFor(() => expect(sentEmails).toEqual(['eve.new@example.com']))
    await waitFor(() => expect(emailField()).toHaveValue('eve.new@example.com'))
    expect(screen.getByText(/Waiting for confirmation from/)).toBeInTheDocument()
  })

  it('typing the current email back in withdraws the change', async () => {
    const user = userEvent.setup()
    mount()
    await waitFor(() => expect(emailField()).toHaveValue('eve.new@example.com'))

    await user.clear(emailField())
    await user.type(emailField(), 'eve@example.com')
    await user.click(screen.getByRole('button', { name: /^update$/i }))

    await waitFor(() => expect(sentEmails).toEqual(['eve@example.com']))
    await waitFor(() => expect(screen.queryByText(/Waiting for confirmation from/)).not.toBeInTheDocument())
    expect(emailField()).toHaveValue('eve@example.com')
  })

  it('Cancel change puts the current email back in the field', async () => {
    const user = userEvent.setup()
    mount()
    await waitFor(() => expect(emailField()).toHaveValue('eve.new@example.com'))

    await user.click(screen.getByRole('button', { name: 'Cancel change' }))

    await waitFor(() => expect(screen.queryByText(/Waiting for confirmation from/)).not.toBeInTheDocument())
    expect(emailField()).toHaveValue('eve@example.com')
  })
})
