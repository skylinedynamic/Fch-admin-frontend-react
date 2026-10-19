import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, screen, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warn: vi.fn() }))
vi.mock('react-toastify', () => ({ toast }))

// "Partner Cannot Be Deleted" and "Are you sure?" are real Bootstrap modals;
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

const { default: Partners } = await import('../../../src/pages/partners/Partners')

const BLOCKED_ONE = "This partner has related records and cannot be deleted. Please change the partner's status instead."

const partners = [
  { id: 5, company_name: 'Hardin Co', full_name: 'Reagan Hardin', email: 'r@example.test', status: 'Active' },
  { id: 6, company_name: 'Oconnor Co', full_name: 'Jessamine Oconnor', email: 'j@example.test', status: 'Active' },
  { id: 7, company_name: 'Free Co', full_name: 'Free Partner', email: 'f@example.test', status: 'Active' },
]

function renderPartners() {
  return renderWithProviders(
    <Routes>
      <Route path="/partners" element={<Partners />} />
      <Route path="/partners/:id" element={<div>Edit partner page</div>} />
    </Routes>,
    { route: '/partners' }
  )
}

function checkReturns(rows: Array<{ id: number; name: string; is_deletable: boolean }>) {
  server.use(
    http.post('*/admin/partners/check-deletable', () =>
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

beforeEach(() => {
  deleteCalls = 0
  toast.success.mockClear()
  toast.error.mockClear()
  useAuthStore.setState({ user: { id: 1, is_host: 1, permissions: ['view partners', 'delete partners', 'update partners'] } } as never)
  server.use(
    http.post('*/admin/partners/fetch-partners', () => HttpResponse.json({ status: true, data: partners, meta: { total: 3 } })),
    http.post('*/admin/partners-stats', () => HttpResponse.json({ status: true, data: {} })),
    http.post('*/common/get-all-users*', () => HttpResponse.json({ status: true, data: [] })),
    http.post('*/admin/partners/multiple-delete', () => {
      deleteCalls++
      return HttpResponse.json({ status: true, message: 'Partner deleted successfully.' })
    })
  )
})
afterEach(() => server.resetHandlers())

describe('Partners - deleting a partner with a paid invoice', () => {
  it('shows "Partner Cannot Be Deleted" instead of the confirmation, and deletes nothing', async () => {
    checkReturns([{ id: 5, name: 'Reagan Hardin', is_deletable: false }])
    const user = userEvent.setup()
    renderPartners()

    await deleteSelection(user, ['Reagan Hardin'])

    const dialog = await screen.findByRole('dialog', { name: 'Partner Cannot Be Deleted' })
    expect(within(dialog).getByTestId('blocked-message').textContent).toBe(BLOCKED_ONE)
    expect(within(dialog).queryByTestId('blocked-others')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Are you sure?' })).not.toBeInTheDocument()
    expect(deleteCalls).toBe(0)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('Go to Partner opens that partner so the status can be changed', async () => {
    checkReturns([{ id: 5, name: 'Reagan Hardin', is_deletable: false }])
    const user = userEvent.setup()
    renderPartners()

    await deleteSelection(user, ['Reagan Hardin'])
    const dialog = await screen.findByRole('dialog', { name: 'Partner Cannot Be Deleted' })
    // Next to Go to Partner, Close steps back to a light button.
    expect(within(dialog).getAllByRole('button', { name: 'Close' })[1]).toHaveClass('btn-light')
    await user.click(within(dialog).getByRole('button', { name: 'Go to Partner' }))

    expect(await screen.findByText('Edit partner page')).toBeInTheDocument()
  })

  // Both the cross at the top and the Close button at the bottom close it.
  it.each([['the cross', 0], ['the Close button', 1]])('%s just closes the modal', async (_label, index) => {
    checkReturns([{ id: 5, name: 'Reagan Hardin', is_deletable: false }])
    const user = userEvent.setup()
    renderPartners()

    await deleteSelection(user, ['Reagan Hardin'])
    const closeButtons = within(await screen.findByRole('dialog', { name: 'Partner Cannot Be Deleted' })).getAllByRole('button', { name: 'Close' })
    expect(closeButtons).toHaveLength(2)
    expect(closeButtons[0]).toHaveClass('btn-close')
    await user.click(closeButtons[index])

    expect(screen.queryByRole('dialog', { name: 'Partner Cannot Be Deleted' })).not.toBeInTheDocument()
    expect(deleteCalls).toBe(0)
  })

  it('names each blocked partner when several are selected, each linking to the partner', async () => {
    checkReturns([
      { id: 5, name: 'Reagan Hardin', is_deletable: false },
      { id: 6, name: 'Jessamine Oconnor', is_deletable: false },
      { id: 7, name: 'Free Partner', is_deletable: true },
    ])
    const user = userEvent.setup()
    renderPartners()

    await deleteSelection(user, ['Reagan Hardin', 'Jessamine Oconnor', 'Free Partner'])

    const dialog = await screen.findByRole('dialog', { name: 'Partners Cannot Be Deleted' })
    expect(dialog).toHaveTextContent('These partners have related records and cannot be deleted. Please change their status instead.')
    expect(dialog).toHaveTextContent('Unselect these partners to delete the other selected partners.')
    expect(dialog).not.toHaveTextContent('Free Partner')
    expect(within(dialog).queryByRole('button', { name: 'Go to Partner' })).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Jessamine Oconnor' }))
    expect(await screen.findByText('Edit partner page')).toBeInTheDocument()
    expect(deleteCalls).toBe(0)
  })

  it('names the one blocked partner among several and offers Go to Partner', async () => {
    checkReturns([
      { id: 5, name: 'Reagan Hardin', is_deletable: false },
      { id: 6, name: 'Jessamine Oconnor', is_deletable: true },
    ])
    const user = userEvent.setup()
    renderPartners()

    await deleteSelection(user, ['Reagan Hardin', 'Jessamine Oconnor'])

    const dialog = await screen.findByRole('dialog', { name: 'Partner Cannot Be Deleted' })
    expect(dialog).toHaveTextContent('Reagan Hardin has related records and cannot be deleted.')
    expect(dialog).toHaveTextContent('Unselect this partner to delete the other selected partners.')
    expect(within(dialog).getByRole('button', { name: 'Go to Partner' })).toBeInTheDocument()
  })

  it('hides Go to Partner from a user who may not edit partners; Close is then the main button', async () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1, permissions: ['view partners', 'delete partners'] } } as never)
    checkReturns([{ id: 5, name: 'Reagan Hardin', is_deletable: false }])
    const user = userEvent.setup()
    renderPartners()

    await deleteSelection(user, ['Reagan Hardin'])

    const dialog = await screen.findByRole('dialog', { name: 'Partner Cannot Be Deleted' })
    expect(within(dialog).queryByRole('button', { name: 'Go to Partner' })).not.toBeInTheDocument()
    expect(within(dialog).getAllByRole('button', { name: 'Close' })[1]).toHaveClass('btn-primary')
  })

  it('shows the same modal, not an error toast, when the delete itself is refused', async () => {
    checkReturns([{ id: 5, name: 'Reagan Hardin', is_deletable: true }])
    server.use(
      http.post('*/admin/partners/multiple-delete', () =>
        HttpResponse.json(
          { status: false, message: BLOCKED_ONE, errors: { blocked: [{ id: 5, name: 'Reagan Hardin' }] } },
          { status: 422 }
        )
      )
    )
    const user = userEvent.setup()
    renderPartners()

    await deleteSelection(user, ['Reagan Hardin'])
    await user.click(within(await screen.findByRole('dialog', { name: 'Are you sure?' })).getByRole('button', { name: 'Yes, Delete It' }))

    expect(await screen.findByRole('dialog', { name: 'Partner Cannot Be Deleted' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Are you sure?' })).not.toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe('Partners - deleting a partner without a paid invoice', () => {
  it('asks for confirmation and deletes (unpaid invoices go with the partner)', async () => {
    checkReturns([
      { id: 5, name: 'Reagan Hardin', is_deletable: true },
      { id: 6, name: 'Jessamine Oconnor', is_deletable: true },
    ])
    const user = userEvent.setup()
    renderPartners()

    await deleteSelection(user, ['Reagan Hardin', 'Jessamine Oconnor'])
    await user.click(within(await screen.findByRole('dialog', { name: 'Are you sure?' })).getByRole('button', { name: 'Yes, Delete It' }))

    await vi.waitFor(() => expect(deleteCalls).toBe(1))
    expect(toast.success).toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: /cannot be deleted/i })).not.toBeInTheDocument()
  })
})
