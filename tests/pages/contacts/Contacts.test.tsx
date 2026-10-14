import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, paginated, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { toast } from 'react-toastify'
import Contacts from '../../../src/pages/contacts/Contacts'

const CONTACTS = [
  { id: 31, full_name: 'Carla Contact', company_name: 'Contact Co', mobile_number: '(555) 111-2222', email: 'carla@example.test', address: '1 Main St', is_referral_partner: true },
  { id: 32, full_name: 'Dan Dialer', company_name: 'Dialer Inc', mobile_number: '(555) 333-4444', email: 'dan@example.test', address: '2 Side St', is_referral_partner: false },
]
const LIST = '/common/contacts/fetch-contacts'

const mount = (permissions: string[], rows = CONTACTS) => {
  signIn({ permissions })
  allowBackgroundCalls()
  const list = api('post', LIST, paginated(rows))
  const view = renderPage(<Contacts />, { path: '/contacts' })
  return { list, ...view }
}

beforeEach(() => vi.clearAllMocks())

describe('Contacts list', () => {
  it('renders the contacts returned by the API', async () => {
    mount(['view contacts'])

    expect(await screen.findByText('Carla Contact')).toBeInTheDocument()
    expect(screen.getByText('Dan Dialer')).toBeInTheDocument()
    expect(screen.getByText('carla@example.test')).toBeInTheDocument()
  })

  it('badges referral partners only', async () => {
    mount(['view contacts'])

    await screen.findByText('Carla Contact')
    expect(screen.getAllByText(/Referral Partner/)).toHaveLength(1)
  })

  it('shows the empty message when there are no contacts', async () => {
    mount(['view contacts'], [])

    expect(await screen.findByText('No contacts found')).toBeInTheDocument()
  })

  it('sends the search term when Filters is clicked', async () => {
    const user = userEvent.setup()
    const { list } = mount(['view contacts'])
    await screen.findByText('Carla Contact')

    await user.type(screen.getByPlaceholderText('Search here...'), 'dan')
    await user.click(screen.getByRole('button', { name: /filters/i }))

    await waitFor(() => expect(JSON.stringify(list.bodies[list.bodies.length - 1])).toContain('dan'))
  })

  it('Clear empties the search box', async () => {
    const user = userEvent.setup()
    mount(['view contacts'])
    await screen.findByText('Carla Contact')
    const search = screen.getByPlaceholderText('Search here...')

    await user.type(search, 'dan')
    await user.click(screen.getByRole('button', { name: /clear/i }))

    expect(search).toHaveValue('')
  })

  it('reports a failed load', async () => {
    signIn({ permissions: ['view contacts'] })
    allowBackgroundCalls()
    api('post', LIST, { status: false, message: 'Contacts are unavailable.' })
    renderPage(<Contacts />, { path: '/contacts' })

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Contacts are unavailable.'))
  })
})

describe('Contacts permissions', () => {
  it('hides Add Contact without the create permission', async () => {
    mount(['view contacts'])

    await screen.findByText('Carla Contact')
    expect(screen.queryByRole('button', { name: /add contact/i })).not.toBeInTheDocument()
  })

  it('Add Contact opens the create page', async () => {
    const user = userEvent.setup()
    mount(['view contacts', 'create contacts'])

    await user.click(await screen.findByRole('button', { name: /add contact/i }))

    expect(await screen.findByTestId('landing')).toHaveTextContent('navigated:/contacts/create')
  })

  it('offers no row selection without the delete permission', async () => {
    const { container } = mount(['view contacts'])

    await screen.findByText('Carla Contact')
    expect(container.querySelectorAll('.p-datatable-tbody .p-checkbox')).toHaveLength(0)
  })

  it('offers row selection with the delete permission', async () => {
    const { container } = mount(['view contacts', 'delete contacts'])

    await screen.findByText('Carla Contact')
    expect(container.querySelectorAll('.p-datatable-tbody .p-checkbox')).toHaveLength(2)
  })
})

describe('Contacts bulk delete', () => {
  const selectFirst = async (user: ReturnType<typeof userEvent.setup>, container: HTMLElement) => {
    await screen.findByText('Carla Contact')
    await user.click(container.querySelector('.p-datatable-tbody .p-checkbox')!)
    await user.click(await screen.findByRole('button', { name: /delete selected/i }))
  }

  it('deletes the selected contacts once confirmed', async () => {
    const user = userEvent.setup()
    const { container } = mount(['view contacts', 'delete contacts'])
    const remove = api('post', '/common/contacts/multiple-delete', { status: true, message: 'Contact(s) deleted successfully.' })

    await selectFirst(user, container)
    await user.click(await screen.findByRole('button', { name: 'Yes, Delete It' }))

    await waitFor(() => expect(remove.bodies[0]).toEqual({ ids: [31] }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Contact(s) deleted successfully.'))
  })

  it('reports a status:false response as a failure', async () => {
    const user = userEvent.setup()
    const { container } = mount(['view contacts', 'delete contacts'])
    api('post', '/common/contacts/multiple-delete', { status: false, message: 'Contact is linked to a lead.' })

    await selectFirst(user, container)
    await user.click(await screen.findByRole('button', { name: 'Yes, Delete It' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Contact is linked to a lead.'))
  })
})
