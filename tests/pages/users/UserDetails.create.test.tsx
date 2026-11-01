import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { toast } from 'react-toastify'
import { act } from '@testing-library/react'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'

// Summernote (reached through the shared modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn() }) }
})

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import UserDetails from '../../../src/pages/users/UserDetails'

const employees = [
  { id: 7, first_name: 'Jane Doe', full_name: 'Jane Doe', email: 'jane@example.test', phone_number_1: '5551234567', country_code: '+1', employee_code: 'EMP-00007', designation: 'Analyst' },
  { id: 9, first_name: 'John Smith', full_name: 'John Smith', email: 'john@example.test', phone_number_1: '(555) 987-6543', country_code: '+1', employee_code: 'EMP-00009', designation: null },
]

const roles = [
  { id: 2, name: 'Staff' },
  { id: 3, name: 'Manager' },
]

function mockLookups(available = employees) {
  server.use(
    http.get('*/common/employees-available-for-user', () => HttpResponse.json({ status: true, message: 'ok', data: available })),
    http.post('*/common/roles/fetch-roles', () => HttpResponse.json({ status: true, data: roles }))
  )
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/users/create" element={<UserDetails />} />
      <Route path="/users" element={<div>Users list page</div>} />
      <Route path="/employees/create" element={<div>New employee page</div>} />
    </Routes>,
    { route: '/users/create' }
  )
}

/** The PrimeReact dropdown that owns the given input id. */
const dropdown = (container: HTMLElement, inputId: string) =>
  container.querySelector(`#${inputId}`)!.closest('.p-dropdown') as HTMLElement

const panelItems = () =>
  Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')) as HTMLElement[]

async function choose(user: ReturnType<typeof userEvent.setup>, container: HTMLElement, inputId: string, text: string) {
  await user.click(dropdown(container, inputId))
  await waitFor(() => expect(panelItems().length).toBeGreaterThan(0))
  await user.click(panelItems().find((el) => el.textContent?.includes(text))!)
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: { id: 1, is_host: 1, permissions: ['create users', 'create employees'] } } as never)
})
afterEach(() => server.resetHandlers())

describe('UserDetails - adding a user', () => {
  it('explains that the employee must exist first and links to the new employee page', async () => {
    mockLookups()
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/create the employee first/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /add user/i })).toBeInTheDocument()
    // The note explains why and what happens when one is picked.
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent(/sign-in account for one of your employees/i)
    expect(note).toHaveTextContent(/only employees who don't have a user account yet/i)
    expect(note).toHaveTextContent(/fills in the name, email and phone number from the employee's record/i)
    const link = screen.getByRole('link', { name: /create new employee/i })
    expect(link).toHaveAttribute('href', '/employees/create')

    await user.click(link)
    expect(await screen.findByText('New employee page')).toBeInTheDocument()
  })

  it('hides the new employee link from someone who cannot create employees', async () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1, permissions: ['create users'] } } as never)
    mockLookups()
    renderPage()

    expect(await screen.findByText(/create the employee first/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /create new employee/i })).not.toBeInTheDocument()
  })

  it('offers only the employees that are not yet connected to a user', async () => {
    mockLookups()
    const user = userEvent.setup()
    const { container } = renderPage()

    await waitFor(() => expect(container.querySelector('#user-employee')).not.toBeNull())
    await user.click(dropdown(container, 'user-employee'))

    await waitFor(() => expect(panelItems()).toHaveLength(2))
    const labels = panelItems().map((el) => el.textContent)
    expect(labels[0]).toContain('Jane Doe')
    expect(labels[1]).toContain('John Smith')
  })

  it('says so when every employee already has a user', async () => {
    mockLookups([])
    renderPage()

    expect(await screen.findByText(/every employee already has a user account/i)).toBeInTheDocument()
  })

  it("fills the user's details from the selected employee", async () => {
    mockLookups()
    const user = userEvent.setup()
    const { container } = renderPage()

    await waitFor(() => expect(container.querySelector('#user-employee')).not.toBeNull())
    await choose(user, container, 'user-employee', 'Jane Doe')

    expect(screen.getByLabelText(/^name/i)).toHaveValue('Jane Doe')
    expect(screen.getByLabelText(/email address/i)).toHaveValue('jane@example.test')
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('(555) 123-4567')

    // Switching employee replaces the filled-in details.
    await choose(user, container, 'user-employee', 'John Smith')
    expect(screen.getByLabelText(/^name/i)).toHaveValue('John Smith')
    expect(screen.getByLabelText(/email address/i)).toHaveValue('john@example.test')
  })

  it('creates the user linked to the employee and returns to the users list', async () => {
    mockLookups()
    let received: Record<string, unknown> | null = null
    server.use(
      http.post('*/common/users', async ({ request }) => {
        received = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ status: true, message: 'User created successfully.', data: { id: 50 } })
      })
    )
    const user = userEvent.setup()
    const { container } = renderPage()

    await waitFor(() => expect(container.querySelector('#user-employee')).not.toBeNull())
    await choose(user, container, 'user-employee', 'Jane Doe')
    await choose(user, container, 'role_id', 'Staff')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText('Users list page')).toBeInTheDocument()
    expect(received).toEqual({
      employee_id: 7,
      name: 'Jane Doe',
      email: 'jane@example.test',
      phone_number: '(555) 123-4567',
      role_id: 2,
      password: 'secret123',
    })
    expect(toast.success).toHaveBeenCalledWith('User created successfully')
  })

  // BUG-123: the email typed in the form was replaced by the employee record's.
  it("sends the email typed in the form, not the employee record's", async () => {
    mockLookups()
    let received: Record<string, unknown> | null = null
    server.use(
      http.post('*/common/users', async ({ request }) => {
        received = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ status: true, message: 'User created successfully.', data: { id: 50 } })
      })
    )
    const user = userEvent.setup()
    const { container } = renderPage()

    await waitFor(() => expect(container.querySelector('#user-employee')).not.toBeNull())
    await choose(user, container, 'user-employee', 'Jane Doe')
    const email = screen.getByLabelText(/email address/i)
    await user.clear(email)
    await user.type(email, 'jane.login@example.test')
    await choose(user, container, 'role_id', 'Staff')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText('Users list page')).toBeInTheDocument()
    expect(received).toMatchObject({ employee_id: 7, email: 'jane.login@example.test' })
  })

  it('treats the phone number as optional', async () => {
    mockLookups()
    let received: Record<string, unknown> | null = null
    server.use(
      http.post('*/common/users', async ({ request }) => {
        received = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ status: true, message: 'User created successfully.', data: { id: 51 } })
      })
    )
    const user = userEvent.setup()
    const { container } = renderPage()

    await waitFor(() => expect(container.querySelector('#user-employee')).not.toBeNull())
    // Not marked as required.
    expect(container.querySelector('label[for="phone_number"]')?.textContent?.trim()).toBe('Phone Number')

    await choose(user, container, 'user-employee', 'Jane Doe')
    await user.clear(screen.getByLabelText(/phone number/i))
    await choose(user, container, 'role_id', 'Staff')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText('Users list page')).toBeInTheDocument()
    expect(screen.queryByText('Phone number is required')).not.toBeInTheDocument()
    expect(received).toMatchObject({ employee_id: 7, phone_number: '' })
  })

  it('will not submit without an employee', async () => {
    mockLookups()
    const post = vi.fn()
    server.use(http.post('*/common/users', () => { post(); return HttpResponse.json({ status: true }) }))
    const user = userEvent.setup()
    const { container } = renderPage()

    await waitFor(() => expect(container.querySelector('#user-employee')).not.toBeNull())
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText('Please select an employee')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('shows the server validation errors under their fields', async () => {
    mockLookups()
    server.use(
      http.post('*/common/users', () =>
        HttpResponse.json(
          { status: false, message: 'Invalid', errors: { employee_id: 'The selected employee already has a user account.' } },
          { status: 422 }
        )
      )
    )
    const user = userEvent.setup()
    const { container } = renderPage()

    await waitFor(() => expect(container.querySelector('#user-employee')).not.toBeNull())
    await choose(user, container, 'user-employee', 'Jane Doe')
    await choose(user, container, 'role_id', 'Staff')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText('The selected employee already has a user account.')).toBeInTheDocument()
    expect(screen.queryByText('Users list page')).not.toBeInTheDocument()
  })
})

describe('UserDetails - adding a user on a newly bought seat', () => {
  it('creates the user as a paid seat for the chosen months', async () => {
    mockLookups()
    let received: Record<string, unknown> | null = null
    server.use(
      http.post('*/common/users', async ({ request }) => {
        received = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ status: true, message: 'ok', data: { id: 51 } })
      })
    )
    const user = userEvent.setup()
    const { container } = renderWithProviders(
      <Routes>
        <Route path="/users/create" element={<UserDetails />} />
        <Route path="/users" element={<div>Users list page</div>} />
      </Routes>,
      { route: { pathname: '/users/create', state: { purchase: { months: 3, totalPrice: 147 } } } as never }
    )

    expect(await screen.findByText(/seat purchase pending activation/i)).toBeInTheDocument()
    expect(screen.getByText('$147.00')).toBeInTheDocument()

    await choose(user, container, 'user-employee', 'Jane Doe')
    await choose(user, container, 'role_id', 'Staff')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(received).not.toBeNull())
    expect(received).toMatchObject({ employee_id: 7, is_paid: true, months: 3 })
  })
})

/**
 * BUG-109: opened directly at the seat limit, Add User only toasted "User
 * limit reached" - the window to buy a seat was on the Users list alone, and
 * going back for it lost what had been typed. The window now opens as soon as
 * the page does (as the list's + Add User), and Save checks again.
 */
describe('UserDetails - adding a user at the seat limit', () => {
  const partnerAdmin = { id: 1, is_host: 0, entity_type: 'Partner', permissions: ['create users'] }

  async function fillAndSave(user: ReturnType<typeof userEvent.setup>, container: HTMLElement) {
    await waitFor(() => expect(container.querySelector('#user-employee')).not.toBeNull())
    await choose(user, container, 'user-employee', 'Jane Doe')
    await choose(user, container, 'role_id', 'Staff')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /^save$/i }))
  }

  /** The purchase window, open (its markup is always on the page). */
  const limitWindowOpen = () =>
    waitFor(() => expect(document.querySelector('.modal.show')).toHaveTextContent('User Limit Reached'))

  /** user-count answers: the seat count on opening, then on Save. */
  function serveCounts(...counts: number[]) {
    let call = 0
    server.use(
      http.get('*/common/user-count', () => {
        const count = counts[Math.min(call++, counts.length - 1)]
        return HttpResponse.json({ status: true, data: { count, seat_limit: 3, per_user_price: 49 } })
      })
    )
  }

  function serveCreate() {
    const sent: { body: Record<string, unknown> | null } = { body: null }
    server.use(
      http.post('*/common/users', async ({ request }) => {
        sent.body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ status: true, message: 'ok', data: { id: 52 } })
      })
    )
    return sent
  }

  it('offers to buy a seat as soon as the page opens, with no Save needed', async () => {
    useAuthStore.setState({ user: partnerAdmin, userSubscription: { is_free_trail: false, user_seats: 3 } } as never)
    mockLookups()
    serveCounts(3)
    renderPage()

    await limitWindowOpen()
  })

  it('goes back to the Users list when the window is closed', async () => {
    useAuthStore.setState({ user: partnerAdmin, userSubscription: { is_free_trail: false, user_seats: 3 } } as never)
    mockLookups()
    serveCounts(3)
    const user = userEvent.setup()
    renderPage()

    await limitWindowOpen()
    await user.click(screen.getAllByRole('button', { name: /^(close|cancel)$/i })[0])

    expect(await screen.findByText('Users list page')).toBeInTheDocument()
  })

  it('opens the form after Proceed, and Save then creates a paid seat without asking again', async () => {
    useAuthStore.setState({ user: partnerAdmin, userSubscription: { is_free_trail: false, user_seats: 3 } } as never)
    mockLookups()
    serveCounts(3)
    const sent = serveCreate()
    const user = userEvent.setup()
    const { container } = renderPage()

    await limitWindowOpen()
    await user.click(screen.getByRole('button', { name: /^proceed$/i }))

    expect(await screen.findByText(/seat purchase pending activation/i)).toBeInTheDocument()
    expect(sent.body).toBeNull()

    await fillAndSave(user, container)

    await waitFor(() => expect(sent.body).not.toBeNull())
    expect(sent.body).toMatchObject({ employee_id: 7, role_id: 2, password: 'secret123', is_paid: true, months: 1 })
  })

  it('still offers the window on Save when the last seat was taken while the form was open', async () => {
    useAuthStore.setState({ user: partnerAdmin, userSubscription: { is_free_trail: false, user_seats: 3 } } as never)
    mockLookups()
    serveCounts(2, 3)
    const sent = serveCreate()
    const user = userEvent.setup()
    const { container } = renderPage()

    await fillAndSave(user, container)

    await limitWindowOpen()
    expect(sent.body).toBeNull()

    await user.click(screen.getByRole('button', { name: /^proceed$/i }))

    await waitFor(() => expect(sent.body).not.toBeNull())
    expect(sent.body).toMatchObject({ employee_id: 7, role_id: 2, password: 'secret123', is_paid: true, months: 1 })
  })

  it('creates the user straight away while a seat is free', async () => {
    useAuthStore.setState({ user: partnerAdmin, userSubscription: { is_free_trail: false, user_seats: 3 } } as never)
    mockLookups()
    serveCounts(1)
    const sent = serveCreate()
    const user = userEvent.setup()
    const { container } = renderPage()

    await fillAndSave(user, container)

    expect(await screen.findByText('Users list page')).toBeInTheDocument()
    expect(document.querySelector('.modal.show')).toBeNull()
    expect(sent.body).not.toHaveProperty('is_paid')
  })

  it('waits for the subscription before choosing which window to open', async () => {
    useAuthStore.setState({ user: partnerAdmin, userSubscription: null } as never)
    mockLookups()
    serveCounts(3)
    const { container } = renderPage()

    // The form is up, and no window yet: whether it is a free trial isn't known.
    await waitFor(() => expect(container.querySelector('#user-employee')).not.toBeNull())
    expect(document.querySelector('.modal.show')).toBeNull()

    act(() => useAuthStore.setState({ userSubscription: { is_free_trail: true, user_seats: 3 } } as never))

    await waitFor(() => expect(document.querySelector('.modal.show')).toHaveTextContent(/You can only add/))
  })

  it('tells a free-trial partner on opening that more users are a paid feature, and closing goes back', async () => {
    useAuthStore.setState({ user: partnerAdmin, userSubscription: { is_free_trail: true, user_seats: 3 } } as never)
    mockLookups()
    serveCounts(3)
    const sent = serveCreate()
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/You can only add/)).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: /^(close|ok|got it)$/i })[0])

    expect(await screen.findByText('Users list page')).toBeInTheDocument()
    expect(sent.body).toBeNull()
  })
})

describe('UserDetails - editing a user', () => {
  it('uses the same page without the employee picker, and keeps status and password change', async () => {
    useAuthStore.setState({ user: { id: 1, is_host: 0, permissions: ['update users'] } } as never)
    mockLookups()
    server.use(
      http.get('*/common/users/7', () =>
        HttpResponse.json({ status: true, data: { id: 7, name: 'Sam Sales', email: 'sam@example.test', phone_number: '(555) 111-2222', role_id: 2, status: 'active' } })
      )
    )
    renderWithProviders(
      <Routes>
        <Route path="/user-details/:id" element={<UserDetails />} />
      </Routes>,
      { route: '/user-details/7' }
    )

    expect(await screen.findByDisplayValue('Sam Sales')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /user details/i })).toBeInTheDocument()
    expect(screen.queryByText(/create the employee first/i)).not.toBeInTheDocument()
    expect(document.querySelector('#user-employee')).toBeNull()
    expect(screen.queryByLabelText(/^password/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/change account password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^update$/i })).toBeInTheDocument()
  })
})
