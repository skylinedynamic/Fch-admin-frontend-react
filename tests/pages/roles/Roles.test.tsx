import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor, within } from '../../test-utils'
import { allowBackgroundCalls, api, invalid, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { toast } from 'react-toastify'
import RolesPermissions from '../../../src/pages/roles/RolesPermissions'
import CreateRole from '../../../src/pages/roles/CreateRole'
import EditRole from '../../../src/pages/roles/EditRole'

const ROLES = [
  { id: 1, name: 'Super Admin', description: 'Everything', code: 'super-admin', is_static: true, permissions: ['view users'], users_count: 2 },
  { id: 2, name: 'Agent', description: 'Front desk', code: 'agent', is_static: false, permissions: ['view clients', 'view users'], users_count: 5 },
]
const PERMISSIONS = [
  { module: 'users', permissions: [{ id: 1, name: 'view users' }, { id: 2, name: 'create users' }] },
  { module: 'clients', permissions: [{ id: 3, name: 'view clients' }, { id: 4, name: 'delete clients' }] },
]

const formLabels = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('label.form-label')).map((label) => label.textContent?.replace(/\s+/g, ' ').trim())

const card = (container: HTMLElement, name: string) =>
  Array.from(container.querySelectorAll('.role-summary-card')).find((el) => el.textContent?.includes(name)) as HTMLElement

beforeEach(() => {
  vi.clearAllMocks()
  signIn({ permissions: ['view roles & permissions'] })
  allowBackgroundCalls()
})

describe('RolesPermissions', () => {
  const mount = (roles = ROLES) => {
    api('get', '/common/roles', { status: true, data: roles })
    return renderPage(<RolesPermissions />, { path: '/roles-permissions' })
  }

  it('renders a card per role with its user count and description', async () => {
    mount()

    expect(await screen.findByRole('heading', { name: 'Agent' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Super Admin' })).toBeInTheDocument()
    expect(screen.getByText('5 Users')).toBeInTheDocument()
    expect(screen.getByText('Front desk')).toBeInTheDocument()
  })

  it('says so when a role has no permissions', async () => {
    mount([{ ...ROLES[1], permissions: [] }])

    expect(await screen.findByText('No permissions assigned to this role')).toBeInTheDocument()
  })

  it('offers delete only on roles that are not built in', async () => {
    const { container } = mount()
    await screen.findByRole('heading', { name: 'Agent' })

    expect(card(container, 'Super Admin').querySelector('.btn-outline-danger')).toBeNull()
    expect(card(container, 'Agent').querySelector('.btn-outline-danger')).not.toBeNull()
  })

  it('Edit Role opens the editor for that role', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    await screen.findByRole('heading', { name: 'Agent' })

    await user.click(within(card(container, 'Agent')).getByRole('button', { name: /edit role/i }))

    expect(await screen.findByTestId('landing')).toHaveTextContent('navigated:/roles-permissions/edit/2')
  })

  it('links to the create page', async () => {
    mount()
    await screen.findByRole('heading', { name: 'Agent' })

    expect(screen.getByRole('link', { name: /add role/i })).toHaveAttribute('href', '/roles-permissions/create')
  })

  /** Defect (BUG-039): the delete-role confirmation said "Deleting employees will remove all information." */
  it('asks about deleting the role, not employees', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    await screen.findByRole('heading', { name: 'Agent' })

    await user.click(card(container, 'Agent').querySelector('.btn-outline-danger')!)

    expect(await screen.findByText('Delete Role?', { selector: 'h4' })).toBeInTheDocument()
    expect(screen.getByText('This will permanently remove the role and all its associated permissions.')).toBeInTheDocument()
    expect(screen.queryByText(/employees/i)).not.toBeInTheDocument()
  })

  it('deletes a role after confirmation', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const remove = api('post', '/common/roles/destroy', { status: true, message: 'Role deleted successfully.' })
    await screen.findByRole('heading', { name: 'Agent' })

    await user.click(card(container, 'Agent').querySelector('.btn-outline-danger')!)
    await user.click(await screen.findByRole('button', { name: 'Yes, Delete It' }))

    await waitFor(() => expect(remove.bodies[0]).toEqual({ ids: [2] }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Role deleted successfully.'))
  })

  it('shows the API message when the delete is refused', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    api('post', '/common/roles/destroy', { status: false, message: 'Role is assigned to users.' }, 422)
    await screen.findByRole('heading', { name: 'Agent' })

    await user.click(card(container, 'Agent').querySelector('.btn-outline-danger')!)
    await user.click(await screen.findByRole('button', { name: 'Yes, Delete It' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Role is assigned to users.'))
  })

  it('View Users loads the role detail', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    api('get', '/common/roles/2', {
      status: true,
      data: { id: 2, name: 'Agent', permission: ['view clients'], users: [{ id: 9, name: 'Zed Zebra', email: 'zed@example.test' }] },
    })
    await screen.findByRole('heading', { name: 'Agent' })

    await user.click(within(card(container, 'Agent')).getByRole('button', { name: /view users/i }))

    expect(await screen.findByText('Zed Zebra')).toBeInTheDocument()
    expect(screen.getByText('zed@example.test')).toBeInTheDocument()
  })

  it('shows an error state when the roles cannot be loaded', async () => {
    api('get', '/common/roles', { status: false, message: 'down' }, 500)
    renderPage(<RolesPermissions />, { path: '/roles-permissions' })

    expect(await screen.findByText('Failed to load roles. Please try again.')).toBeInTheDocument()
  })
})

describe('CreateRole', () => {
  const mount = () => {
    api('post', '/common/permissions', { status: true, data: PERMISSIONS })
    return renderPage(<CreateRole />, { path: '/roles-permissions/create' })
  }

  /** Defect (BUG-038): an empty name returned before the request, so Save showed nothing. */
  it('sends an empty name and shows the API "role name is required" under the marked field', async () => {
    const user = userEvent.setup()
    mount()
    const create = api('post', '/common/roles', invalid({ name: 'The role name is required.' }), 422)
    const input = await screen.findByPlaceholderText('Enter a role name')

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('The role name is required.')).toBeInTheDocument()
    expect(create.bodies[0]).toMatchObject({ name: '' })
    expect(input).toHaveClass('is-invalid')
    expect(screen.queryByTestId('landing')).not.toBeInTheDocument()
  })

  it('marks Role name and Role Permissions as required, not the Module Permissions box', async () => {
    const { container } = mount()
    await screen.findByPlaceholderText('Enter a role name')

    expect(formLabels(container)).toEqual(expect.arrayContaining(['Role name *', 'Role Permissions *']))
    expect(screen.getByRole('heading', { name: 'Module Permissions' })).toBeInTheDocument()
  })

  it('shows "permissions are required" above the permissions box, not inside it', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    api('post', '/common/roles', invalid({ permission_ids: 'Permissions are required.' }), 422)

    await user.type(await screen.findByPlaceholderText('Enter a role name'), 'Agent')
    await user.click(screen.getByRole('button', { name: /save/i }))

    const message = await screen.findByText('Permissions are required.')
    expect(container.querySelector('.perm-card')!.contains(message)).toBe(false)
    expect(container.querySelector('.perm-card')).toHaveClass('border-danger')
  })

  it('posts the ticked permission ids', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const create = api('post', '/common/roles', { status: true, message: 'Role created successfully.' })
    await waitFor(() => expect(container.querySelector('#selectAll-clients')).not.toBeNull())

    await user.type(screen.getByPlaceholderText('Enter a role name'), 'Reviewer')
    await user.type(screen.getByPlaceholderText('Enter role description'), 'Reads things')
    await user.click(container.querySelector('#selectAll-clients')!)
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(create.bodies[0]).toMatchObject({ name: 'Reviewer', description: 'Reads things' }))
    expect([...create.bodies[0].permission_ids].sort()).toEqual([3, 4])
    expect(await screen.findByTestId('landing')).toHaveTextContent('navigated:/roles-permissions')
  })

  it('Select All ticks and unticks every permission of a module', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    await waitFor(() => expect(container.querySelector('#selectAll-users')).not.toBeNull())
    const boxes = () => Array.from(container.querySelectorAll('input[id^="perm-users-"]')) as HTMLInputElement[]

    await user.click(container.querySelector('#selectAll-users')!)
    expect(boxes().every((box) => box.checked)).toBe(true)

    await user.click(container.querySelector('#selectAll-users')!)
    expect(boxes().some((box) => box.checked)).toBe(false)
  })

  it('unticking one permission clears the module Select All', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    await waitFor(() => expect(container.querySelector('#selectAll-users')).not.toBeNull())

    await user.click(container.querySelector('#selectAll-users')!)
    await user.click(container.querySelector('input[id^="perm-users-"]')!)

    expect(container.querySelector('#selectAll-users')).not.toBeChecked()
  })

  it('Administrator Access sends every permission id', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const create = api('post', '/common/roles', { status: true })
    await waitFor(() => expect(container.querySelector('#adminAccessToggle')).not.toBeNull())

    await user.type(screen.getByPlaceholderText('Enter a role name'), 'Root')
    await user.click(container.querySelector('#adminAccessToggle')!)
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect([...create.bodies[0].permission_ids].sort()).toEqual([1, 2, 3, 4]))
  })

  it('shows API validation errors under the fields and stays on the page', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    api('post', '/common/roles', invalid({ name: 'The name has already been taken.', permission_ids: 'Select at least one permission.' }), 422)

    await user.type(await screen.findByPlaceholderText('Enter a role name'), 'Agent')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('The name has already been taken.')).toBeInTheDocument()
    expect(screen.getByText('Select at least one permission.')).toBeInTheDocument()
    expect(container.querySelector('.perm-card')).toHaveClass('border-danger')
    expect(screen.queryByTestId('landing')).not.toBeInTheDocument()
  })
})

describe('EditRole', () => {
  const mount = () => {
    api('post', '/common/permissions', { status: true, data: PERMISSIONS })
    api('get', '/common/roles/2', { status: true, data: { id: 2, name: 'Agent', description: 'Front desk', permission: { 3: 'view clients' }, users: [] } })
    return renderPage(<EditRole />, { path: '/roles-permissions/edit/:id', route: '/roles-permissions/edit/2' })
  }

  it('loads the role and pre-ticks its permissions', async () => {
    const { container } = mount()

    await waitFor(() => expect(screen.getByPlaceholderText('Enter a role name')).toHaveValue('Agent'))
    expect(screen.getByPlaceholderText('Enter role description')).toHaveValue('Front desk')
    await waitFor(() => expect(container.querySelectorAll('input[id^="perm-clients-"]:checked')).toHaveLength(1))
    expect(container.querySelectorAll('input[id^="perm-users-"]:checked')).toHaveLength(0)
  })

  it('PUTs the edited role and returns to the list', async () => {
    const user = userEvent.setup()
    mount()
    const update = api('put', '/common/roles/2', { status: true, message: 'Role updated successfully.' })
    await waitFor(() => expect(screen.getByPlaceholderText('Enter a role name')).toHaveValue('Agent'))

    await user.clear(screen.getByPlaceholderText('Enter a role name'))
    await user.type(screen.getByPlaceholderText('Enter a role name'), 'Senior Agent')
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => expect(update.bodies[0]).toMatchObject({ name: 'Senior Agent' }))
    expect(update.bodies[0].permission_ids).toContain(3)
    expect(await screen.findByTestId('landing')).toHaveTextContent('navigated:/roles-permissions')
  })

  /** Defect (BUG-038): a cleared name returned before the request, so Update showed nothing. */
  it('shows the API "role name is required" when the name is cleared', async () => {
    const user = userEvent.setup()
    mount()
    const update = api('put', '/common/roles/2', invalid({ name: 'The role name is required.' }), 422)
    await waitFor(() => expect(screen.getByPlaceholderText('Enter a role name')).toHaveValue('Agent'))

    await user.clear(screen.getByPlaceholderText('Enter a role name'))
    await user.click(screen.getByRole('button', { name: /update/i }))

    expect(await screen.findByText('The role name is required.')).toBeInTheDocument()
    expect(update.bodies[0]).toMatchObject({ name: '' })
    expect(screen.getByPlaceholderText('Enter a role name')).toHaveClass('is-invalid')
    expect(screen.queryByTestId('landing')).not.toBeInTheDocument()
  })

  it('marks Role name and Role Permissions as required, not the Module Permissions box', async () => {
    const { container } = mount()
    await waitFor(() => expect(screen.getByPlaceholderText('Enter a role name')).toHaveValue('Agent'))

    expect(formLabels(container)).toEqual(expect.arrayContaining(['Role name *', 'Role Permissions *']))
    expect(screen.getByRole('heading', { name: 'Module Permissions' })).toBeInTheDocument()
  })

  it('marks the permissions box when the API says permissions are required', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    api('put', '/common/roles/2', invalid({ permission_ids: 'Permissions are required.' }), 422)
    await waitFor(() => expect(container.querySelectorAll('input[id^="perm-clients-"]:checked')).toHaveLength(1))
    expect(container.querySelector('.perm-card')).not.toHaveClass('border-danger')

    await user.click(container.querySelector('input[id^="perm-clients-"]:checked')!)
    await user.click(screen.getByRole('button', { name: /update/i }))

    const message = await screen.findByText('Permissions are required.')
    expect(container.querySelector('.perm-card')!.contains(message)).toBe(false)
    expect(container.querySelector('.perm-card')).toHaveClass('border-danger')
  })
})
