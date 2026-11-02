import { describe, expect, it, vi } from 'vitest'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { allowBackgroundCalls, api, paginated, renderPage, signIn } from '../../pages/pageHarness'
import { screen } from '../../test-utils'
import BillingDetails from '../../../src/pages/billing/BillingDetails'

/**
 * BUG-049: the monthly installment is rounded to the cent and the last one
 * takes up the difference (6696.70 over 12: 558.06 a month, the last 558.04).
 * The subscriber's billing page shows it beside the monthly installment.
 */
const open = (subscription: Record<string, unknown>) => {
  signIn({ permissions: ['view subscriptions'] })
  allowBackgroundCalls()
  api('get', '/common/billing/1101', {
    status: true,
    data: {
      entity_type: 'Borrower',
      entity_id: 7,
      subscriber: { id: 7, first_name: 'Bo', last_name: 'Rower', email: 'bo@example.test' },
      subscription: {
        id: 1101,
        status: 'Active',
        enrollment_type: 'Installment',
        installment_type: 1,
        installment_count: 12,
        installments_paid: 4,
        subscription_amount_per_month: '$558.06',
        ...subscription,
      },
      upcoming_billing: { upcoming_billing_amount: 558.06, upcoming_billing_date: '2026-12-01' },
    },
  })
  api('post', '/common/invoices/fetch-invoices', paginated([]))
  renderPage(<BillingDetails />, { path: '/billing/:id', route: '/billing/1101' })
}

describe('Billing details - the last installment', () => {
  it('shows the last installment when it is adjusted for rounding', async () => {
    open({ final_installment_amount: '$558.04' })

    expect(await screen.findByText('Last Installment')).toBeInTheDocument()
    expect(screen.getByText('$558.04')).toBeInTheDocument()
  })

  it('shows no separate last installment when the plan splits evenly', async () => {
    open({ final_installment_amount: null })

    expect(await screen.findByText('Monthly Installment')).toBeInTheDocument()
    expect(screen.queryByText('Last Installment')).not.toBeInTheDocument()
  })
})
