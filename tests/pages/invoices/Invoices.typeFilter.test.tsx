import { describe, expect, it, vi } from 'vitest'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// Summernote (reached through shared modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, paginated, renderPage, signIn } from '../pageHarness'
import Invoices from '../../../src/pages/invoices/Invoices'

const LIST = '/common/invoices/fetch-invoices'
const ROWS = [
  { id: 1001, created_at: '2026-07-19', invoice_id: 'INV-20260719003', customer_name: 'Acme Funding', payment_amount: '$499.00', type: 'Installment', status: 'Paid' },
]

const typeDropdown = (current = 'All Types') =>
  Array.from(document.querySelectorAll('.employee-filter-dropdown')).find(
    (el) => el.textContent?.includes(current)
  ) as HTMLElement

const option = (label: string) =>
  Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).find(
    (el) => el.textContent === label
  ) as HTMLElement

const filtersButton = () =>
  screen.getAllByRole('button').find((b) => /^\W*filters?$/i.test(b.textContent?.trim() ?? '')) as HTMLElement

/** The Invoices list has a Type filter that sends the invoice type the API stores. */
describe('Invoices type filter', () => {
  const mount = () => {
    signIn({ permissions: ['view invoices'] })
    allowBackgroundCalls()
    const list = api('post', LIST, paginated(ROWS))
    renderPage(<Invoices />, { path: '/invoices' })
    return list
  }

  it('offers every invoice type', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByText('INV-20260719003')

    await user.click(typeDropdown())

    for (const label of ['All Types', 'Enrollment', 'Down Payment', 'Installment', 'Platform Fee', 'Borrower Fee', 'User Seat', 'Commission Payout']) {
      expect(option(label)).toBeTruthy()
    }
  })

  it('sends the picked type, and nothing for All Types', async () => {
    const user = userEvent.setup()
    const list = mount()
    await screen.findByText('INV-20260719003')

    await user.click(typeDropdown())
    await user.click(option('Commission Payout'))
    await user.click(filtersButton())
    await waitFor(() => expect(list.bodies[list.bodies.length - 1]).toMatchObject({ type: 'commission_payout' }))

    await user.click(typeDropdown('Commission Payout'))
    await user.click(option('All Types'))
    await user.click(filtersButton())
    await waitFor(() => expect(list.bodies[list.bodies.length - 1]).toMatchObject({ type: null }))
  })
})
