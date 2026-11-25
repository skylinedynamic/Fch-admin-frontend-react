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
  { id: 1001, created_at: '2026-07-19', invoice_id: 'INV-20260719003', customer_name: 'Acme Funding', payment_amount: '$499.00', type: 'installment', status: 'Expired' },
]

// What the list API sends as status_options: fch-api Invoice::STATUSES.
const STATUS_OPTIONS = ['Paid', 'Unpaid', 'Processing', 'Expired'].map((status) => ({ label: status, value: status }))

const statusDropdown = () =>
  Array.from(document.querySelectorAll('.employee-filter-dropdown')).find(
    (el) => el.textContent?.includes('All Status')
  ) as HTMLElement

const openOptions = () =>
  Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).map((el) => el.textContent)

/**
 * Defect (BUG-021 round 2, R2-OP-INV-05): the Status filter offered "Overdue",
 * which no invoice ever gets, and left out "Expired", which older invoices
 * carry. The filter now offers the statuses the API stores and sends the one
 * picked.
 *
 * R3-BUG-078: the client's filter still had its own list. Both now offer
 * exactly what the API sends as status_options - one list for every portal.
 */
describe('Invoices status filter', () => {
  const mount = () => {
    signIn({ permissions: ['view invoices'] })
    allowBackgroundCalls()
    const list = api('post', LIST, { ...paginated(ROWS), status_options: STATUS_OPTIONS })
    renderPage(<Invoices />, { path: '/invoices' })
    return list
  }

  it("offers exactly the API's statuses: Expired, and never Overdue", async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByText('INV-20260719003')

    await user.click(statusDropdown())

    expect(openOptions()).toEqual(['All Status', 'Paid', 'Unpaid', 'Processing', 'Expired'])
  })

  it('sends Expired to the API when it is picked', async () => {
    const user = userEvent.setup()
    const list = mount()
    await screen.findByText('INV-20260719003')

    await user.click(statusDropdown())
    await user.click(
      Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).find(
        (el) => el.textContent === 'Expired'
      ) as HTMLElement
    )
    await user.click(
      screen.getAllByRole('button').find((b) => /^\W*filters?$/i.test(b.textContent?.trim() ?? '')) as HTMLElement
    )

    await waitFor(() => expect(list.bodies[list.bodies.length - 1]).toMatchObject({ status: 'Expired' }))
  })

  it('shows an Expired invoice with a coloured badge', async () => {
    mount()
    const badge = await screen.findByText('Expired', { selector: 'span.badge' })
    expect(badge.className).not.toMatch(/bg-primary-subtle/)
  })
})
