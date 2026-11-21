import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-toastify'
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

const MIN = { id: 102, first_name: 'QA-TEST R3', last_name: 'Emp Min', email: 'qa.r3empmin@example.test', address: '1 Main St', country: 'United States' }

let sent: FormData[]

/**
 * R3-BUG-071: a field cleared on edit is sent as cleared, not left out - else
 * the API keeps the old value and says the update worked. A required one
 * (Email) is then refused by the API, and its message shows under the field.
 */
describe('EmployeeDetails - a field cleared on edit', () => {
  beforeEach(() => {
    sent = []
    vi.mocked(toast.success).mockClear()
    server.use(
      http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: {} })),
      http.post('*/common/roles/fetch-roles', () => HttpResponse.json({ status: true, data: [] })),
      http.post('*/common/departments/fetch-departments', () => HttpResponse.json({ status: true, data: [] })),
      http.get('*/common/employees/102', () => HttpResponse.json({ status: true, data: { ...MIN, user: null } })),
      http.post('*/common/employees/102', async ({ request }) => {
        const body = await request.formData()
        sent.push(body)
        // As the API: an empty email is refused (UpdateEmployeeRequest).
        if (body.get('email') === '') {
          return HttpResponse.json({ status: false, message: 'Email is required.', errors: { email: ['Email is required.'] } }, { status: 422 })
        }
        return HttpResponse.json({ status: true, data: { employee: { ...MIN, address: body.get('address') }, user: null } })
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
      { route: '/employees/102' }
    )

  it('refuses a cleared Email, showing "Email is required." under it - nothing reported saved', async () => {
    const user = userEvent.setup()
    mount()
    const email = await screen.findByPlaceholderText('Enter email')
    await waitFor(() => expect(email).toHaveValue(MIN.email))

    await user.clear(email)
    await user.click(screen.getByRole('button', { name: /^update$/i }))

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0].has('email')).toBe(true)
    expect(sent[0].get('email')).toBe('')
    expect(await screen.findByText('Email is required.')).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
    expect(email).toHaveValue('')
  })

  it('sends a cleared optional field as cleared', async () => {
    const user = userEvent.setup()
    mount()
    const address = await screen.findByPlaceholderText('Enter address')
    await waitFor(() => expect(address).toHaveValue(MIN.address))

    await user.clear(address)
    await user.click(screen.getByRole('button', { name: /^update$/i }))

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0].get('address')).toBe('')
    expect(sent[0].get('email')).toBe(MIN.email)
  })
})
