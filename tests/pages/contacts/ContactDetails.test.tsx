import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, invalid, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

// Summernote (reached through the shared activity modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import { toast } from 'react-toastify'
import ContactDetails from '../../../src/pages/contacts/ContactDetails'

const CONTACT = {
  id: 31, full_name: 'Carla Contact', first_name: 'Carla', last_name: 'Contact', company_name: 'Contact Co',
  mobile_number: '(555) 111-2222', email: 'carla@example.test', address: '1 Main St', is_referral_partner: true,
}

const field = (container: HTMLElement, name: string) => container.querySelector(`input[name="${name}"]`) as HTMLInputElement

const mountCreate = (permissions = ['view contacts', 'create contacts']) => {
  signIn({ permissions })
  allowBackgroundCalls()
  return renderPage(<ContactDetails />, { path: '/contacts/create' })
}

const mountEdit = (permissions = ['view contacts', 'update contacts']) => {
  signIn({ permissions })
  allowBackgroundCalls()
  api('get', '/common/contacts/31', { status: true, data: CONTACT })
  return renderPage(<ContactDetails />, { path: '/contacts/:id', route: '/contacts/31' })
}

const fillValid = async (user: ReturnType<typeof userEvent.setup>, container: HTMLElement, name = 'Nora New Person') => {
  await user.type(field(container, 'full_name'), name)
  await user.type(field(container, 'email'), 'nora@example.test')
  await user.type(field(container, 'mobile_number'), '5551234567')
}

beforeEach(() => vi.clearAllMocks())

describe('ContactDetails - create validation', () => {
  it('requires name, email and mobile number before calling the API', async () => {
    const user = userEvent.setup()
    mountCreate()
    const create = api('post', '/common/contacts', { status: true, data: { id: 1 } })

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Full name is required')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Mobile number is required')).toBeInTheDocument()
    expect(create.calls).toBe(0)
  })

  it('rejects a malformed email', async () => {
    const user = userEvent.setup()
    const { container } = mountCreate()

    await user.type(field(container, 'full_name'), 'Nora')
    await user.type(field(container, 'email'), 'nora@invalid')
    await user.type(field(container, 'mobile_number'), '5551234567')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument()
  })

  it('rejects an incomplete mobile number', async () => {
    const user = userEvent.setup()
    const { container } = mountCreate()

    await user.type(field(container, 'full_name'), 'Nora')
    await user.type(field(container, 'email'), 'nora@example.test')
    await user.type(field(container, 'mobile_number'), '55512')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText(/Please enter a valid mobile number/)).toBeInTheDocument()
  })

  it('formats the mobile number as it is typed', async () => {
    const user = userEvent.setup()
    const { container } = mountCreate()

    await user.type(field(container, 'mobile_number'), '5551234567')

    expect(field(container, 'mobile_number')).toHaveValue('(555) 123-4567')
  })

  it('treats a whitespace-only name as missing', async () => {
    const user = userEvent.setup()
    const { container } = mountCreate()

    await user.type(field(container, 'full_name'), '   ')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Full name is required')).toBeInTheDocument()
  })
})

describe('ContactDetails - create', () => {
  it('posts the contact with the name split into first and last', async () => {
    const user = userEvent.setup()
    const { container } = mountCreate()
    const create = api('post', '/common/contacts', { status: true, data: { id: 40 } })

    await fillValid(user, container)
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() =>
      expect(create.bodies[0]).toMatchObject({
        full_name: 'Nora New Person', first_name: 'Nora', last_name: 'New Person',
        email: 'nora@example.test', mobile_number: '(555) 123-4567',
      })
    )
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Contact created successfully'))
    expect(await screen.findByTestId('landing', {}, { timeout: 3000 })).toHaveTextContent('navigated:/contacts')
  })

  it('sends an empty last name for a single-word name', async () => {
    const user = userEvent.setup()
    const { container } = mountCreate()
    const create = api('post', '/common/contacts', { status: true, data: { id: 41 } })

    await fillValid(user, container, 'Cher')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(create.bodies[0]).toMatchObject({ first_name: 'Cher', last_name: '' }))
  })

  it('shows API field errors, mapping first_name onto the full name field', async () => {
    const user = userEvent.setup()
    const { container } = mountCreate()
    api('post', '/common/contacts', invalid({ first_name: 'The first name is too long.', email: 'The email has already been taken.' }), 422)

    await fillValid(user, container)
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('The first name is too long.')).toBeInTheDocument()
    expect(screen.getByText('The email has already been taken.')).toBeInTheDocument()
    expect(screen.queryByTestId('landing')).not.toBeInTheDocument()
  })

  it('toasts a failure that has no field errors', async () => {
    const user = userEvent.setup()
    const { container } = mountCreate()
    api('post', '/common/contacts', { status: false, message: 'Contact storage is offline.' }, 500)

    await fillValid(user, container)
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Contact storage is offline.'))
  })

  it('hides Save without the create permission', () => {
    mountCreate(['view contacts'])

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute('href', '/contacts')
  })
})

describe('ContactDetails - edit', () => {
  it('loads the contact into the form', async () => {
    const { container } = mountEdit()

    await waitFor(() => expect(field(container, 'full_name')).toHaveValue('Carla Contact'))
    expect(field(container, 'email')).toHaveValue('carla@example.test')
    expect(field(container, 'company_name')).toHaveValue('Contact Co')
    expect(container.querySelector('#is_referral_partner')).toBeChecked()
  })

  it('PUTs the changes to the contact', async () => {
    const user = userEvent.setup()
    const { container } = mountEdit()
    const update = api('put', '/common/contacts/31', { status: true, data: CONTACT })
    await waitFor(() => expect(field(container, 'full_name')).toHaveValue('Carla Contact'))

    await user.clear(field(container, 'company_name'))
    await user.type(field(container, 'company_name'), 'Renamed Co')
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => expect(update.bodies[0]).toMatchObject({ company_name: 'Renamed Co', first_name: 'Carla', last_name: 'Contact' }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Contact updated successfully'))
  })

  it('runs the same validation on update', async () => {
    const user = userEvent.setup()
    const { container } = mountEdit()
    const update = api('put', '/common/contacts/31', { status: true, data: CONTACT })
    await waitFor(() => expect(field(container, 'full_name')).toHaveValue('Carla Contact'))

    await user.clear(field(container, 'email'))
    await user.click(screen.getByRole('button', { name: /update/i }))

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(update.calls).toBe(0)
  })

  it('hides Update without the update permission', async () => {
    const { container } = mountEdit(['view contacts'])

    await waitFor(() => expect(field(container, 'full_name')).toHaveValue('Carla Contact'))
    expect(screen.queryByRole('button', { name: /update/i })).not.toBeInTheDocument()
  })

  it('reports a contact that fails to load', async () => {
    signIn({ permissions: ['view contacts', 'update contacts'] })
    allowBackgroundCalls()
    api('get', '/common/contacts/31', { status: false, message: 'Not found' }, 404)
    renderPage(<ContactDetails />, { path: '/contacts/:id', route: '/contacts/31' })

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load contact details'))
  })
})
