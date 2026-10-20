import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, screen, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warn: vi.fn() }))
vi.mock('react-toastify', () => ({ toast }))

// The filter dropdown data is not what is under test.
vi.mock('../../../src/modules/client/queries', async (importActual) => ({
  ...(await importActual<typeof import('../../../src/modules/client/queries')>()),
  usePartners: () => ({ data: [] }),
  useAllUsers: () => ({ data: [] }),
  useBorrowerTiers: () => ({ data: [] }),
}))

// The table only hands the page a selection; stand it in with buttons that select.
vi.mock('../../../src/pages/clients/components/ClientListTable', () => ({
  default: (props: { onSelectionChange: (rows: unknown[]) => void }) => (
    <div>
      <button type="button" onClick={() => props.onSelectionChange([{ id: 5, full_name: 'Reagan Hardin' }])}>select one</button>
      <button
        type="button"
        onClick={() => props.onSelectionChange([
          { id: 5, full_name: 'Reagan Hardin' },
          { id: 6, full_name: 'Jessamine Oconnor' },
          { id: 7, full_name: 'Free Client' },
        ])}
      >
        select three
      </button>
    </div>
  ),
}))
vi.mock('../../../src/pages/clients/components/ClientStats', () => ({ default: () => null }))

// The Bootstrap modals themselves are not what is under test.
vi.mock('../../../src/components/Common/Modals/DeleteConfirmationModal', () => ({
  default: (props: { show: boolean; onConfirm: () => void; onClose: () => void }) =>
    props.show ? (
      <div role="dialog" aria-label="Are you sure?">
        <button type="button" onClick={props.onConfirm}>Yes, Delete It</button>
        <button type="button" onClick={props.onClose}>Close</button>
      </div>
    ) : null,
}))
// "Client Cannot Be Deleted" is a real Bootstrap modal; stand in for Bootstrap's
// show/hide, which toggle `show` and aria-hidden on the modal element.
vi.mock('bootstrap/js/dist/modal', () => ({
  default: class {
    constructor(private el: HTMLElement) {}
    show() { this.el.classList.add('show'); this.el.removeAttribute('aria-hidden') }
    hide() { this.el.classList.remove('show'); this.el.setAttribute('aria-hidden', 'true') }
    dispose() {}
  },
}))

const { default: Clients } = await import('../../../src/pages/clients/Clients')

const BLOCKED_SENTENCE = 'has related records and cannot be deleted.'

function renderClients() {
  return renderWithProviders(
    <Routes>
      <Route path="/clients" element={<Clients />} />
      <Route path="/clients/:id" element={<div>Edit client page</div>} />
    </Routes>,
    { route: '/clients' }
  )
}

function checkReturns(rows: Array<{ id: number; name: string; is_deletable: boolean }>) {
  server.use(
    http.post('*/common/borrowers/check-deletable', () =>
      HttpResponse.json({ status: true, data: rows.map(r => ({ ...r, reason: r.is_deletable ? null : 'paid' })) })
    )
  )
}

async function deleteSelection(user: ReturnType<typeof userEvent.setup>, which: 'select one' | 'select three') {
  await user.click(await screen.findByRole('button', { name: which }))
  await user.click(await screen.findByRole('button', { name: /delete selected/i }))
}

let deleteCalls = 0

beforeEach(() => {
  deleteCalls = 0
  toast.success.mockClear()
  toast.error.mockClear()
  useAuthStore.setState({ user: { id: 1, is_host: 1, permissions: ['view clients', 'delete clients', 'update clients'] } } as never)
  server.use(
    http.post('*/common/borrowers-multiple-delete', () => {
      deleteCalls++
      return HttpResponse.json({ status: true, message: 'Borrower(s) deleted successfully.' })
    })
  )
})
afterEach(() => server.resetHandlers())

describe('Clients - deleting a client with a paid invoice', () => {
  it('shows "Client Cannot Be Deleted" instead of the confirmation, and deletes nothing', async () => {
    checkReturns([{ id: 5, name: 'Reagan Hardin', is_deletable: false }])
    const user = userEvent.setup()
    renderClients()

    await deleteSelection(user, 'select one')

    const dialog = await screen.findByRole('dialog', { name: 'Client Cannot Be Deleted' })
    // One short message (two lines in the modal).
    expect(within(dialog).getByTestId("blocked-message").textContent).toBe(
      "This client has related records and cannot be deleted. Please change the client's status instead."
    )
    expect(within(dialog).queryByTestId("blocked-others")).not.toBeInTheDocument()
    // Plain wording: no invoice detail, nothing in bold.
    expect(dialog).not.toHaveTextContent(/invoice/i)
    expect(dialog.querySelector('strong, b')).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Are you sure?' })).not.toBeInTheDocument()
    expect(deleteCalls).toBe(0)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('Go to Client opens that client so the status can be changed', async () => {
    checkReturns([{ id: 5, name: 'Reagan Hardin', is_deletable: false }])
    const user = userEvent.setup()
    renderClients()

    await deleteSelection(user, 'select one')
    const dialog = await screen.findByRole('dialog', { name: 'Client Cannot Be Deleted' })
    // Next to Go to Client, Close steps back to a light button.
    expect(within(dialog).getAllByRole('button', { name: 'Close' })[1]).toHaveClass('btn-light')
    await user.click(within(dialog).getByRole('button', { name: 'Go to Client' }))

    expect(await screen.findByText('Edit client page')).toBeInTheDocument()
  })

  // Both the cross at the top and the Close button at the bottom close it.
  it.each([['the cross', 0], ['the Close button', 1]])('%s just closes the modal', async (_label, index) => {
    checkReturns([{ id: 5, name: 'Reagan Hardin', is_deletable: false }])
    const user = userEvent.setup()
    renderClients()

    await deleteSelection(user, 'select one')
    const closeButtons = within(await screen.findByRole('dialog', { name: 'Client Cannot Be Deleted' })).getAllByRole('button', { name: 'Close' })
    expect(closeButtons).toHaveLength(2)
    expect(closeButtons[0]).toHaveClass('btn-close')
    await user.click(closeButtons[index])

    expect(screen.queryByRole('dialog', { name: 'Client Cannot Be Deleted' })).not.toBeInTheDocument()
    expect(deleteCalls).toBe(0)
  })

  it('opens as a "flip" modal on the page body, like the delete confirmation', async () => {
    checkReturns([{ id: 5, name: 'Reagan Hardin', is_deletable: false }])
    const user = userEvent.setup()
    renderClients()

    await deleteSelection(user, 'select one')
    const dialog = await screen.findByRole('dialog', { name: 'Client Cannot Be Deleted' })

    expect(dialog).toHaveClass('modal', 'fade', 'flip', 'show')
    expect(dialog.parentElement).toBe(document.body)
  })

  it('names each blocked client when several are selected, each linking to the client', async () => {
    checkReturns([
      { id: 5, name: 'Reagan Hardin', is_deletable: false },
      { id: 6, name: 'Jessamine Oconnor', is_deletable: false },
      { id: 7, name: 'Free Client', is_deletable: true },
    ])
    const user = userEvent.setup()
    renderClients()

    await deleteSelection(user, 'select three')

    const dialog = await screen.findByRole('dialog', { name: 'Clients Cannot Be Deleted' })
    expect(dialog).toHaveTextContent('These clients have related records and cannot be deleted. Please change their status instead.')
    expect(dialog).toHaveTextContent('Unselect these clients to delete the other selected clients.')
    expect(dialog).not.toHaveTextContent('Free Client')
    expect(within(dialog).queryByRole('button', { name: 'Go to Client' })).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Jessamine Oconnor' }))
    expect(await screen.findByText('Edit client page')).toBeInTheDocument()
    expect(deleteCalls).toBe(0)
  })

  it('names the one blocked client among several and offers Go to Client', async () => {
    checkReturns([
      { id: 5, name: 'Reagan Hardin', is_deletable: false },
      { id: 6, name: 'Jessamine Oconnor', is_deletable: true },
      { id: 7, name: 'Free Client', is_deletable: true },
    ])
    const user = userEvent.setup()
    renderClients()

    await deleteSelection(user, 'select three')

    const dialog = await screen.findByRole('dialog', { name: 'Client Cannot Be Deleted' })
    expect(dialog).toHaveTextContent(`Reagan Hardin ${BLOCKED_SENTENCE}`)
    expect(dialog).toHaveTextContent('Unselect this client to delete the other selected clients.')
    expect(within(dialog).getByRole('button', { name: 'Go to Client' })).toBeInTheDocument()
  })

  it('hides Go to Client from a user who may not edit clients; Close is then the main button', async () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1, permissions: ['view clients', 'delete clients'] } } as never)
    checkReturns([{ id: 5, name: 'Reagan Hardin', is_deletable: false }])
    const user = userEvent.setup()
    renderClients()

    await deleteSelection(user, 'select one')

    const dialog = await screen.findByRole('dialog', { name: 'Client Cannot Be Deleted' })
    expect(within(dialog).queryByRole('button', { name: 'Go to Client' })).not.toBeInTheDocument()
    expect(within(dialog).getAllByRole('button', { name: 'Close' })).toHaveLength(2)
    expect(within(dialog).getAllByRole('button', { name: 'Close' })[1]).toHaveClass('btn-primary')
  })

  it('lists blocked clients as plain names for a user who may not edit clients', async () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1, permissions: ['view clients', 'delete clients'] } } as never)
    checkReturns([
      { id: 5, name: 'Reagan Hardin', is_deletable: false },
      { id: 6, name: 'Jessamine Oconnor', is_deletable: false },
    ])
    const user = userEvent.setup()
    renderClients()

    await deleteSelection(user, 'select three')

    const dialog = await screen.findByRole('dialog', { name: 'Clients Cannot Be Deleted' })
    expect(dialog).toHaveTextContent('Jessamine Oconnor')
    expect(within(dialog).queryByRole('button', { name: 'Jessamine Oconnor' })).not.toBeInTheDocument()
  })

  it('shows the same modal, not an error toast, when the delete itself is refused', async () => {
    checkReturns([{ id: 5, name: 'Reagan Hardin', is_deletable: true }])
    server.use(
      http.post('*/common/borrowers-multiple-delete', () =>
        HttpResponse.json(
          { status: false, message: 'This client has related records and cannot be deleted.', errors: { blocked: [{ id: 5, name: 'Reagan Hardin' }] } },
          { status: 422 }
        )
      )
    )
    const user = userEvent.setup()
    renderClients()

    await deleteSelection(user, 'select one')
    await user.click(within(await screen.findByRole('dialog', { name: 'Are you sure?' })).getByRole('button', { name: 'Yes, Delete It' }))

    expect(await screen.findByRole('dialog', { name: 'Client Cannot Be Deleted' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Are you sure?' })).not.toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe('Clients - deleting a client without a paid invoice', () => {
  it('asks for confirmation and deletes (unpaid invoices go with the client)', async () => {
    checkReturns([{ id: 5, name: 'Reagan Hardin', is_deletable: true }])
    const user = userEvent.setup()
    renderClients()

    await deleteSelection(user, 'select one')
    await user.click(within(await screen.findByRole('dialog', { name: 'Are you sure?' })).getByRole('button', { name: 'Yes, Delete It' }))

    await vi.waitFor(() => expect(deleteCalls).toBe(1))
    expect(toast.success).toHaveBeenCalledWith('Client(s) deleted successfully.')
    expect(screen.queryByRole('dialog', { name: /cannot be deleted/i })).not.toBeInTheDocument()
  })
})
