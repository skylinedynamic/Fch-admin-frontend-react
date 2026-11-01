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
// and Outstanding sort too - by the API, on the figures each row shows.
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
    ['Outstanding', 'outstanding_amount'],
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
