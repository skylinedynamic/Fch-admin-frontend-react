import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { toast } from 'react-toastify'
import CreditAccountsList from '../../../src/pages/credit-builder/credit-accounts/CreditAccountsList'

/**
 * BUG-042: Admin › Credit Builder › Credit Accounts - the host selects cards
 * with the row checkboxes and deletes them together. A card a borrower has
 * applied for (`can_delete: false`) cannot be selected. Status is set on the
 * card's details page, so the list's badge is a plain label.
 */
const rows = [
  { id: 71, card_name: 'Ink Business Cash', issuer: 'Chase', status: 'Active', can_delete: true },
  { id: 72, card_name: 'Spark Classic', issuer: 'Capital One', status: 'Inactive', can_delete: true },
  { id: 73, card_name: 'Applied Card', issuer: 'Amex', status: 'Active', can_delete: false },
]

const signIn = (permissions: string[]) =>
  useAuthStore.setState({ token: 't', user: { id: 1, is_host: 1, permissions } } as never)

let listCalls = 0

beforeEach(() => {
  vi.clearAllMocks()
  listCalls = 0
  signIn(['view credit accounts', 'create credit accounts', 'update credit accounts', 'delete credit accounts'])
  server.use(
    http.post('*/admin/credit-builder/credit-accounts/fetch-accounts', () => {
      listCalls++
      return HttpResponse.json({ status: true, data: rows, meta: { total: rows.length } })
    })
  )
})
afterEach(() => server.resetHandlers())

/** The row's selection checkbox, looked up fresh - selecting re-renders the table. */
const rowCheckbox = (name: string) =>
  within(screen.getByText(name).closest('tr') as HTMLElement).queryAllByRole('checkbox')[0]

describe('Credit accounts - delete selected', () => {
  it('deletes the selected cards in one call, then reloads the list', async () => {
    const bulk = vi.fn()
    server.use(
      http.post('*/admin/credit-builder/credit-accounts/multiple-delete', async ({ request }) => {
        bulk(await request.json())
        return HttpResponse.json({ status: true, message: 'Credit accounts deleted successfully.', data: { deleted: 2 } })
      })
    )
    const user = userEvent.setup()
    renderWithProviders(<CreditAccountsList />, { route: '/credit-accounts' })

    await screen.findByText('Ink Business Cash')
    await user.click(rowCheckbox('Ink Business Cash'))
    await user.click(rowCheckbox('Spark Classic'))
    const loadsBefore = listCalls

    // As on the other lists: once rows are checked, Actions replaces Add Account.
    expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /add account/i })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /delete selected/i }))
    await user.click(await screen.findByRole('button', { name: /yes, delete it/i }))

    await waitFor(() => expect(bulk).toHaveBeenCalledWith({ ids: [71, 72] }))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    await waitFor(() => expect(listCalls).toBeGreaterThan(loadsBefore))
  })

  it('Delete Selected with a card a borrower applied for says it cannot be deleted, and deletes nothing', async () => {
    const bulk = vi.fn()
    server.use(
      http.post('*/admin/credit-builder/credit-accounts/multiple-delete', async ({ request }) => {
        bulk(await request.json())
        return HttpResponse.json({ status: true, data: { deleted: 1 } })
      })
    )
    const user = userEvent.setup()
    renderWithProviders(<CreditAccountsList />, { route: '/credit-accounts' })

    await screen.findByText('Applied Card')
    // Any card can be ticked.
    await user.click(rowCheckbox('Ink Business Cash'))
    await user.click(rowCheckbox('Applied Card'))
    expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /delete selected/i }))

    // The message replaces the delete confirmation and names the kept card.
    const blocked = await screen.findByRole('dialog', { name: /cannot be deleted/i })
    expect(blocked).toHaveTextContent('Applied Card')
    expect(blocked).not.toHaveTextContent('Ink Business Cash')
    expect(blocked).toHaveTextContent(/inactive/i)
    expect(screen.queryByRole('button', { name: /yes, delete it/i })).not.toBeInTheDocument()
    expect(bulk).not.toHaveBeenCalled()
  })

  it('select all ticks every card; deleting names the ones borrowers applied for', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreditAccountsList />, { route: '/credit-accounts' })

    await screen.findByText('Applied Card')
    const header = screen.getAllByRole('columnheader')[0]
    // Select all listens on the header's input.
    await user.click(header.querySelector('input[type="checkbox"]') as HTMLElement)
    expect(screen.queryByRole('dialog', { name: /cannot be deleted/i })).not.toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /delete selected/i }))
    expect(await screen.findByRole('dialog', { name: /cannot be deleted/i })).toHaveTextContent('Applied Card')
  })

  it('names the cards when the API refuses because borrowers applied meanwhile', async () => {
    server.use(
      http.post('*/admin/credit-builder/credit-accounts/multiple-delete', () =>
        HttpResponse.json(
          { status: false, message: 'Nothing was deleted: borrowers have applied for Ink Business Cash.', errors: { applied: [{ id: 71, name: 'Ink Business Cash' }] } },
          { status: 422 }
        )
      )
    )
    const user = userEvent.setup()
    renderWithProviders(<CreditAccountsList />, { route: '/credit-accounts' })

    await screen.findByText('Ink Business Cash')
    await user.click(rowCheckbox('Ink Business Cash'))
    await user.click(await screen.findByRole('button', { name: /delete selected/i }))
    await user.click(await screen.findByRole('button', { name: /yes, delete it/i }))

    const blocked = await screen.findByRole('dialog', { name: /cannot be deleted/i })
    expect(blocked).toHaveTextContent('Ink Business Cash')
  })

  it('without the delete permission there are no checkboxes and no delete action', async () => {
    signIn(['view credit accounts', 'update credit accounts'])
    renderWithProviders(<CreditAccountsList />, { route: '/credit-accounts' })

    await screen.findByText('Ink Business Cash')
    expect(rowCheckbox('Ink Business Cash')).toBeUndefined()
    expect(screen.queryByRole('button', { name: /delete selected/i })).not.toBeInTheDocument()
  })

  it('the status badge is a label - status is changed on the details page', async () => {
    const patch = vi.fn()
    server.use(http.patch('*/admin/credit-builder/credit-accounts/:id/status', () => {
      patch()
      return HttpResponse.json({ status: true })
    }))
    const user = userEvent.setup()
    renderWithProviders(<CreditAccountsList />, { route: '/credit-accounts' })

    const badge = within((await screen.findByText('Ink Business Cash')).closest('tr') as HTMLElement).getByText('Active')
    await user.click(badge)

    expect(badge).not.toHaveAttribute('title')
    expect(patch).not.toHaveBeenCalled()
  })
})
