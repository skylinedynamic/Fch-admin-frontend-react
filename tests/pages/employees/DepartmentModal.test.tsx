import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { toast } from 'react-toastify'
import DepartmentModal from '../../../src/pages/employees/components/DepartmentModal'
import { withCurrentDepartment } from '../../../src/pages/employees/components/form-sections/PersonalInfoSection'

const DEPARTMENTS = [{ id: 16, name: 'Sales' }, { id: 30, name: 'QA-TEST Run2 Dept' }]

const open = (onSuccess = vi.fn()) => {
  renderWithProviders(<DepartmentModal visible onHide={vi.fn()} onSuccess={onSuccess} departments={DEPARTMENTS} />)
  return { user: userEvent.setup(), onSuccess }
}

beforeEach(() => {
  vi.clearAllMocks()
  signIn({ permissions: ['view employees', 'create employees'] })
})

describe('Employees › Add New Department', () => {
  // Defect: BUG-183 - the x deleted the department at once, with no confirmation.
  it('asks before deleting a department', async () => {
    const remove = api('delete', '/common/departments/30', { status: true, message: 'Department deleted successfully', data: [] })
    const { user, onSuccess } = open()

    await user.click(screen.getByRole('button', { name: 'Delete QA-TEST Run2 Dept' }))
    expect(remove.calls).toBe(0)
    expect(await screen.findByText('This will permanently remove the department "QA-TEST Run2 Dept".')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Yes, Delete It', hidden: true }))
    await waitFor(() => expect(remove.calls).toBe(1))
    expect(toast.success).toHaveBeenCalledWith('Department deleted successfully')
    expect(onSuccess).toHaveBeenCalled()
  })

  it('does nothing when the confirmation is closed', async () => {
    const remove = api('delete', '/common/departments/30', { status: true, data: [] })
    const { user } = open()

    await user.click(screen.getByRole('button', { name: 'Delete QA-TEST Run2 Dept' }))
    const confirm = (await screen.findByText('Delete Department?')).closest('.modal-content') as HTMLElement
    await user.click(within(confirm).getByRole('button', { name: 'Close', hidden: true }))

    expect(remove.calls).toBe(0)
  })

  // Defect: BUG-183 - a department employees are in is refused; the reason is shown.
  it('says why a department in use was not deleted', async () => {
    const message = 'Department "QA-TEST Run2 Dept" is assigned to 1 employee and cannot be deleted. Move the employee to another department first.'
    api('delete', '/common/departments/30', { status: false, message }, 422)
    const { user, onSuccess } = open()

    await user.click(screen.getByRole('button', { name: 'Delete QA-TEST Run2 Dept' }))
    await user.click(await screen.findByRole('button', { name: 'Yes, Delete It', hidden: true }))

    // Assigned meanwhile: the refusal opens the "cannot be deleted" modal, as for clients and tags.
    expect(await screen.findByText('Department Cannot Be Deleted')).toBeInTheDocument()
    expect(screen.getByTestId('blocked-message')).toHaveTextContent(message)
    expect(toast.error).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  // A department employees are in opens "cannot be deleted" straight away - no confirmation, no delete call.
  it('says a department in use cannot be deleted, without asking to delete it', async () => {
    const remove = api('delete', '/common/departments/16', { status: true, data: [] })
    renderWithProviders(
      <DepartmentModal visible onHide={vi.fn()} onSuccess={vi.fn()} departments={[{ id: 16, name: 'Sales', employees_count: 2 }]} />
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Delete Sales' }))

    expect(await screen.findByText('Department Cannot Be Deleted')).toBeInTheDocument()
    expect(screen.getByTestId('blocked-message')).toHaveTextContent(
      'Department "Sales" is assigned to 2 employees and cannot be deleted. Move them to another department first.'
    )
    // The confirmation stays closed (it is always mounted, hidden).
    expect(screen.getByText('Delete Department?').closest('.modal')).not.toHaveClass('show')
    expect(remove.calls).toBe(0)
  })

  // As "Go to Client" on a client that cannot be deleted: the way out is to move those employees.
  it('offers to view the employees in a department that cannot be deleted', async () => {
    renderPage(
      <DepartmentModal visible onHide={vi.fn()} onSuccess={vi.fn()} departments={[{ id: 16, name: 'Sales & Ops', employees_count: 2 }]} />,
      { path: '/employees/create' }
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Delete Sales & Ops' }))
    await user.click(await screen.findByRole('button', { name: /view employees/i, hidden: true }))

    expect(await screen.findByTestId('landing')).toHaveTextContent('navigated:/employees?department=Sales+%26+Ops')
  })

  // Defect: BUG-182 - a name that already existed was added again.
  it('shows the API message under the field when the name already exists', async () => {
    api('post', '/common/departments', { status: false, message: 'Department already exists.', errors: { name: 'Department already exists.' } }, 422)
    const { user, onSuccess } = open()

    await user.type(screen.getByLabelText('Department Name'), 'Sales')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(await screen.findByText('Department already exists.')).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  // Defect: the "already exists" message showed, but the input box itself was
  // not marked - the p-invalid class it got has no style on a plain input here.
  it('marks the input box itself as invalid, until the name is changed', async () => {
    api('post', '/common/departments', { status: false, message: 'Department already exists.', errors: { name: 'Department already exists.' } }, 422)
    const { user } = open()
    const input = screen.getByLabelText('Department Name')

    await user.type(input, 'Sales')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await screen.findByText('Department already exists.')
    expect(input).toHaveClass('form-control', 'is-invalid')
    expect(input).toHaveAttribute('aria-invalid', 'true')

    await user.type(input, 's')
    expect(input).not.toHaveClass('is-invalid')
    expect(screen.queryByText('Department already exists.')).not.toBeInTheDocument()
  })

  it('an empty name is shown on the input box, not only in a toast', async () => {
    const { user } = open()
    const input = screen.getByLabelText('Department Name')

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(await screen.findByText('Department name is required')).toBeInTheDocument()
    expect(input).toHaveClass('is-invalid')
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe('Employee form › department options', () => {
  it("keeps an employee's department that is no longer in the list", () => {
    expect(withCurrentDepartment(DEPARTMENTS, 'QA-TEST Dept').map((d) => d.name)).toEqual(['Sales', 'QA-TEST Run2 Dept', 'QA-TEST Dept'])
  })

  it('adds nothing when the department is listed or empty', () => {
    expect(withCurrentDepartment(DEPARTMENTS, 'Sales')).toBe(DEPARTMENTS)
    expect(withCurrentDepartment(DEPARTMENTS, '')).toBe(DEPARTMENTS)
  })
})
