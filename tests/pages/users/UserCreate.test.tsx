import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { toast } from 'react-toastify'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import UserCreate from '../../../src/pages/users/UserCreate'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn() }) }
})

const employees = [
  { id: 7, first_name: 'Jane', last_name: 'Doe', full_name: 'Jane Doe', email: 'jane@example.test', phone_number_1: '5551234567', country_code: '+1', employee_code: 'EMP-00007', designation: 'Analyst' },
  { id: 9, first_name: 'John', last_name: 'Smith', full_name: 'John Smith', email: 'john@example.test', phone_number_1: '(555) 987-6543', country_code: '+1', employee_code: 'EMP-00009', designation: null },
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
      <Route path="/users/create" element={<UserCreate />} />
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

describe('UserCreate', () => {
  it('explains that the employee must exist first and links to the new employee page', async () => {
    mockLookups()
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/create the employee first/i)).toBeInTheDocument()
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
    await choose(user, container, 'user-role', 'Staff')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /save account/i }))

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

  it('will not submit without an employee', async () => {
    mockLookups()
    const post = vi.fn()
    server.use(http.post('*/common/users', () => { post(); return HttpResponse.json({ status: true }) }))
    const user = userEvent.setup()
    const { container } = renderPage()

    await waitFor(() => expect(container.querySelector('#user-employee')).not.toBeNull())
    await user.click(screen.getByRole('button', { name: /save account/i }))

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
    await choose(user, container, 'user-role', 'Staff')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /save account/i }))

    expect(await screen.findByText('The selected employee already has a user account.')).toBeInTheDocument()
    expect(screen.queryByText('Users list page')).not.toBeInTheDocument()
  })
})

describe('UserCreate when buying an extra seat', () => {
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
        <Route path="/users/create" element={<UserCreate />} />
        <Route path="/users" element={<div>Users list page</div>} />
      </Routes>,
      { route: { pathname: '/users/create', state: { purchase: { months: 3, totalPrice: 147 } } } as never }
    )

    expect(await screen.findByText(/seat purchase pending activation/i)).toBeInTheDocument()
    expect(screen.getByText('$147.00')).toBeInTheDocument()

    await choose(user, container, 'user-employee', 'Jane Doe')
    await choose(user, container, 'user-role', 'Staff')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /save account/i }))

    await waitFor(() => expect(received).not.toBeNull())
    expect(received).toMatchObject({ employee_id: 7, is_paid: true, months: 3 })
  })
})
