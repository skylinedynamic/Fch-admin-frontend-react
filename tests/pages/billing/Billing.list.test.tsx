import { describe, expect, it, vi } from 'vitest'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// Summernote (reached through shared modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import { toast } from 'react-toastify'
import { describeListPage } from '../../pages/listPageSuite'
import { allowBackgroundCalls, api, paginated, renderPage, signIn } from '../../pages/pageHarness'
import { screen, waitFor } from '../../test-utils'
import userEvent from '@testing-library/user-event'
import Billing from '../../../src/pages/billing/Billing'

describeListPage(
  {
    name: 'Upcoming billing',
    page: () => <Billing />,
    path: '/billing',
    view: ['view subscriptions'],
    list: { method: 'post', path: '/common/billing/fetch-upcoming' },
    rows: [
      { id: 1, subscription_id: 1101, subscriber_name: 'Acme Funding', upcoming_billing_type: 'Platform Fee', upcoming_billing_amount: '499.00', upcoming_billing_date: '2026-04-01', outstanding_amount: '0.00', enrollment_type: 'Monthly', status: 'Active' },
    ],
    shows: ['Acme Funding', 'Monthly'],
    emptyText: 'No upcoming billing found',
    search: { placeholder: 'Search by name, email...', apply: 'enter' },
    sort: { initial: { field: 'upcoming_billing_date', order: 'asc' }, header: 'Name', field: 'partner_name' },
  },
  toast
)

// BUG-012: the list loads by upcoming billing date (soonest first), and Amount
// and Amount Due (was "Outstanding", R3-BUG-019) sort too - by the API, on the
// figures each row shows.
describe('Upcoming billing - sorting', () => {
  const open = async () => {
    signIn({ permissions: ['view subscriptions'] })
    allowBackgroundCalls()
    const list = api('post', '/common/billing/fetch-upcoming', paginated([
      { id: 1, subscription_id: 1101, subscriber_name: 'Acme Funding', upcoming_billing_type: 'Platform Fee', upcoming_billing_amount: '499.00', upcoming_billing_date: '2026-04-01', outstanding_amount: '0.00', enrollment_type: 'Monthly', status: 'Active' },
    ]))
    renderPage(<Billing />, { path: '/billing' })
    await screen.findByText('Acme Funding')
    return list
  }
  const header = (title: string) => screen.getAllByRole('columnheader').find((th) => th.textContent?.trim().startsWith(title))!
  const lastSort = (list: { bodies: any[] }) => {
    const body = list.bodies[list.bodies.length - 1] ?? {}
    return { field: body.sort_field, order: body.sort_order }
  }

  it.each([
    ['Amount', 'upcoming_billing_amount'],
    ['Amount Due', 'outstanding_amount'],
  ])('%s sorts ascending, then descending', async (title, field) => {
    const user = userEvent.setup()
    const list = await open()
    expect(header(title)).toHaveClass('p-sortable-column')

    await user.click(header(title).querySelector('.p-column-title') ?? header(title))
    await waitFor(() => expect(lastSort(list)).toEqual({ field, order: 'asc' }))

    await user.click(header(title).querySelector('.p-column-title') ?? header(title))
    await waitFor(() => expect(lastSort(list)).toEqual({ field, order: 'desc' }))
  })
})

// The host's row for a borrower fee a partner still owes: billed to the
// partner, naming the client it is for; it opens the fee invoice, not the
// client's subscription.
describe('Upcoming billing - borrower fee row', () => {
  const FEE_ROW = {
    id: 73, subscription_id: 73, billing_row: 'borrower_fee', subscriber_type: 'Partner', subscriber_name: 'Wanda Wells',
    subscriber_email: 'wanda@example.test', for_client_name: 'Dee Client', fee_invoice_id: 55, fee_invoice_number: 'INV-55',
    upcoming_billing_type: 'Client Activation Fee', upcoming_billing_amount: 800, upcoming_billing_date: '2026-05-24',
    outstanding_amount: 800, current_phase: 'borrower_fee', enrollment_type: null, status: 'Unpaid', is_billing_paused: false,
  }

  it('names the client and opens the fee invoice', async () => {
    const user = userEvent.setup()
    signIn({ permissions: ['view subscriptions'] })
    allowBackgroundCalls()
    api('post', '/common/billing/fetch-upcoming', paginated([FEE_ROW]))
    renderPage(<Billing />, { path: '/billing' })

    expect(await screen.findByText('Wanda Wells')).toBeInTheDocument()
    expect(screen.getByText('For client: Dee Client')).toBeInTheDocument()
    expect(screen.getByText('Unpaid')).toHaveClass('bg-danger-subtle')

    await user.click(screen.getByText('Wanda Wells'))
    expect(await screen.findByTestId('landing')).toHaveTextContent('navigated:/invoices/55')
  })
})

/**
 * R3-BUG-019: "Outstanding" was read as what is left on an installment plan,
 * but it is only the invoices raised and still unpaid (the plan's later
 * installments are not invoiced yet). The column and the card now say
 * "Amount Due", and the column says what it counts.
 */
describe('Upcoming billing - Amount Due', () => {
  it('names the column and the card Amount Due, and says what it counts', async () => {
    signIn({ permissions: ['view subscriptions'] })
    allowBackgroundCalls()
    api('post', '/common/billing/fetch-upcoming', paginated([
      { id: 1, subscription_id: 1101, subscriber_name: 'Acme Funding', upcoming_billing_type: 'Installment', upcoming_billing_amount: '699.70', upcoming_billing_date: '2026-04-01', outstanding_amount: '699.70', enrollment_type: 'Installment', status: 'Active' },
    ]))
    renderPage(<Billing />, { path: '/billing' })
    await screen.findByText('Acme Funding')

    const due = screen.getAllByRole('columnheader').find((th) => th.textContent?.trim().startsWith('Amount Due'))
    expect(due).toBeTruthy()
    expect(due!.querySelector('[title]')).toHaveAttribute('title', 'Unpaid invoices raised so far. Installments not billed yet are not included.')
    expect(screen.getAllByText('Amount Due').length).toBeGreaterThanOrEqual(2) // the column and the card
    expect(screen.queryByText('Outstanding')).not.toBeInTheDocument()
  })
})
