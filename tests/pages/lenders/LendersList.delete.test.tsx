import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, screen, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warn: vi.fn() }))
vi.mock('react-toastify', () => ({ toast }))

// "Lender Cannot Be Deleted" and "Are you sure?" are real Bootstrap modals;
// stand in for Bootstrap's show/hide, which toggle `show` and aria-hidden.
vi.mock('bootstrap/js/dist/modal', () => ({
  default: class {
    constructor(private el: HTMLElement) {}
    show() { this.el.classList.add('show'); this.el.removeAttribute('aria-hidden') }
    hide() { this.el.classList.remove('show'); this.el.setAttribute('aria-hidden', 'true') }
    dispose() {}
  },
}))
// The confirmation is not what is under test.
vi.mock('../../../src/components/Common/Modals/DeleteConfirmationModal', () => ({
  default: (props: { show: boolean; onConfirm: () => void; onClose: () => void }) =>
    props.show ? (
      <div role="dialog" aria-label="Are you sure?">
        <button type="button" onClick={props.onConfirm}>Yes, Delete It</button>
        <button type="button" onClick={props.onClose}>Close</button>
      </div>
    ) : null,
}))

const { default: LendersList } = await import('../../../src/pages/lenders/LendersList')

const BLOCKED_ONE = "This lender has related records and cannot be deleted. Please change the lender's status instead."

const lenders = [
  { id: 5, legal_name: 'Hardin Capital LLC', name: 'Reagan Capital', status: 'Active' },
  { id: 6, legal_name: 'Oconnor Funding LLC', name: 'Jessamine Funding', status: 'Active' },
  { id: 7, legal_name: 'Free Lender LLC', name: 'Free Lender', status: 'Active' },
]

function renderLenders() {
  return renderWithProviders(
    <Routes>
      <Route path="/lenders" element={<LendersList />} />
      <Route path="/lenders/:id" element={<div>Edit lender page</div>} />
    </Routes>,
    { route: '/lenders' }
  )
}

function checkReturns(rows: Array<{ id: number; name: string; is_deletable: boolean }>) {
  server.use(
    http.post('*/admin/lenders/check-deletable', () =>
      HttpResponse.json({ status: true, data: rows.map(r => ({ ...r, reason: r.is_deletable ? null : BLOCKED_ONE })) })
    )
  )
}

/** The row's selection checkbox, looked up fresh - selecting re-renders the table. */
const rowCheckbox = (name: string) =>
  within(screen.getByText(name).closest('tr') as HTMLElement).getAllByRole('checkbox')[0]

async function deleteSelection(user: ReturnType<typeof userEvent.setup>, names: string[]) {
  await screen.findByText(names[0])
  for (const name of names) await user.click(rowCheckbox(name))
  await user.click(await screen.findByRole('button', { name: /delete selected/i }))
}

let deleteCalls = 0
let singleDeletes = 0
let deleteBodies: unknown[] = []

beforeEach(() => {
  deleteCalls = 0
  singleDeletes = 0
  deleteBodies = []
  toast.success.mockClear()
  toast.error.mockClear()
  useAuthStore.setState({ user: { id: 1, is_host: 1, permissions: ['view lenders', 'delete lenders', 'update lenders'] } } as never)
  server.use(
    http.get('*/admin/lenders', () => HttpResponse.json({ status: true, data: lenders, meta: { total: 3 } })),
    http.get('*/admin/lenders/product-categories', () => HttpResponse.json({ status: true, data: [] })),
    http.delete('*/admin/lenders/:id', () => { singleDeletes++; return HttpResponse.json({ status: true }) }),
    http.post('*/admin/lenders/multiple-delete', async ({ request }) => {
      deleteBodies.push(await request.json())
      deleteCalls++
      return HttpResponse.json({ status: true, message: 'Lender deleted successfully.' })
    })
  )
})
afterEach(() => server.resetHandlers())

describe('Lenders - deleting a lender assigned to a funding request', () => {
  it('shows "Lender Cannot Be Deleted" instead of the confirmation, and deletes nothing', async () => {
    checkReturns([{ id: 5, name: 'Reagan Capital', is_deletable: false }])
    const user = userEvent.setup()
    renderLenders()

    await deleteSelection(user, ['Reagan Capital'])

    const dialog = await screen.findByRole('dialog', { name: 'Lender Cannot Be Deleted' })
    expect(within(dialog).getByTestId('blocked-message').textContent).toBe(BLOCKED_ONE)
    expect(within(dialog).queryByTestId('blocked-others')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Are you sure?' })).not.toBeInTheDocument()
    expect(deleteCalls).toBe(0)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('Go to Lender opens that lender so the status can be changed', async () => {
    checkReturns([{ id: 5, name: 'Reagan Capital', is_deletable: false }])
    const user = userEvent.setup()
    renderLenders()

    await deleteSelection(user, ['Reagan Capital'])
    const dialog = await screen.findByRole('dialog', { name: 'Lender Cannot Be Deleted' })
    // Next to Go to Lender, Close steps back to a light button.
    expect(within(dialog).getAllByRole('button', { name: 'Close' })[1]).toHaveClass('btn-light')
    await user.click(within(dialog).getByRole('button', { name: 'Go to Lender' }))

    expect(await screen.findByText('Edit lender page')).toBeInTheDocument()
  })

  // Both the cross at the top and the Close button at the bottom close it.
  it.each([['the cross', 0], ['the Close button', 1]])('%s just closes the modal', async (_label, index) => {
    checkReturns([{ id: 5, name: 'Reagan Capital', is_deletable: false }])
    const user = userEvent.setup()
    renderLenders()

    await deleteSelection(user, ['Reagan Capital'])
    const closeButtons = within(await screen.findByRole('dialog', { name: 'Lender Cannot Be Deleted' })).getAllByRole('button', { name: 'Close' })
    expect(closeButtons).toHaveLength(2)
    expect(closeButtons[0]).toHaveClass('btn-close')
    await user.click(closeButtons[index])

    expect(screen.queryByRole('dialog', { name: 'Lender Cannot Be Deleted' })).not.toBeInTheDocument()
    expect(deleteCalls).toBe(0)
  })

  it('names each blocked lender when several are selected, each linking to the lender', async () => {
    checkReturns([
      { id: 5, name: 'Reagan Capital', is_deletable: false },
      { id: 6, name: 'Jessamine Funding', is_deletable: false },
      { id: 7, name: 'Free Lender', is_deletable: true },
    ])
    const user = userEvent.setup()
    renderLenders()

    await deleteSelection(user, ['Reagan Capital', 'Jessamine Funding', 'Free Lender'])

    const dialog = await screen.findByRole('dialog', { name: 'Lenders Cannot Be Deleted' })
    expect(dialog).toHaveTextContent('These lenders have related records and cannot be deleted. Please change their status instead.')
    expect(dialog).toHaveTextContent('Unselect these lenders to delete the other selected lenders.')
    expect(dialog).not.toHaveTextContent('Free Lender')
    expect(within(dialog).queryByRole('button', { name: 'Go to Lender' })).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Jessamine Funding' }))
    expect(await screen.findByText('Edit lender page')).toBeInTheDocument()
    expect(deleteCalls).toBe(0)
  })

  it('names the one blocked lender among several and offers Go to Lender', async () => {
    checkReturns([
      { id: 5, name: 'Reagan Capital', is_deletable: false },
      { id: 6, name: 'Jessamine Funding', is_deletable: true },
    ])
    const user = userEvent.setup()
    renderLenders()

    await deleteSelection(user, ['Reagan Capital', 'Jessamine Funding'])

    const dialog = await screen.findByRole('dialog', { name: 'Lender Cannot Be Deleted' })
    expect(dialog).toHaveTextContent('Reagan Capital has related records and cannot be deleted.')
    expect(dialog).toHaveTextContent('Unselect this lender to delete the other selected lenders.')
    expect(within(dialog).getByRole('button', { name: 'Go to Lender' })).toBeInTheDocument()
  })

  it('hides Go to Lender from a user who may not edit lenders; Close is then the main button', async () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1, permissions: ['view lenders', 'delete lenders'] } } as never)
    checkReturns([{ id: 5, name: 'Reagan Capital', is_deletable: false }])
    const user = userEvent.setup()
    renderLenders()

    await deleteSelection(user, ['Reagan Capital'])

    const dialog = await screen.findByRole('dialog', { name: 'Lender Cannot Be Deleted' })
    expect(within(dialog).queryByRole('button', { name: 'Go to Lender' })).not.toBeInTheDocument()
    expect(within(dialog).getAllByRole('button', { name: 'Close' })[1]).toHaveClass('btn-primary')
  })

  it('shows the same modal, not an error toast, when the delete itself is refused', async () => {
    checkReturns([{ id: 5, name: 'Reagan Capital', is_deletable: true }])
    server.use(
      http.post('*/admin/lenders/multiple-delete', () =>
        HttpResponse.json(
          { status: false, message: BLOCKED_ONE, errors: { blocked: [{ id: 5, name: 'Reagan Capital' }] } },
          { status: 422 }
        )
      )
    )
    const user = userEvent.setup()
    renderLenders()

    await deleteSelection(user, ['Reagan Capital'])
    await user.click(within(await screen.findByRole('dialog', { name: 'Are you sure?' })).getByRole('button', { name: 'Yes, Delete It' }))

    expect(await screen.findByRole('dialog', { name: 'Lender Cannot Be Deleted' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Are you sure?' })).not.toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe('Lenders - deleting lenders not in use', () => {
  // The page used to send one DELETE per lender, all at once - a refused one
  // left the others deleted. The selection now goes in one call.
  it('asks for confirmation and deletes the selection in one call', async () => {
    checkReturns([
      { id: 5, name: 'Reagan Capital', is_deletable: true },
      { id: 6, name: 'Jessamine Funding', is_deletable: true },
    ])
    const user = userEvent.setup()
    renderLenders()

    await deleteSelection(user, ['Reagan Capital', 'Jessamine Funding'])
    await user.click(within(await screen.findByRole('dialog', { name: 'Are you sure?' })).getByRole('button', { name: 'Yes, Delete It' }))

    await vi.waitFor(() => expect(deleteCalls).toBe(1))
    expect(deleteBodies).toEqual([{ ids: [5, 6] }])
    expect(singleDeletes).toBe(0)
    expect(toast.success).toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: /cannot be deleted/i })).not.toBeInTheDocument()
  })
})
