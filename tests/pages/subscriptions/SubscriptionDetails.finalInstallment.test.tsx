import { describe, expect, it, vi } from 'vitest'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { allowBackgroundCalls, api, paginated, renderPage, signIn } from '../../pages/pageHarness'
import { screen } from '../../test-utils'
import SubscriptionDetails from '../../../src/pages/subscriptions/SubscriptionDetails'

/**
 * BUG-049: the monthly installment is rounded to the cent and the last one
 * takes up the difference (6696.70 over 12: 558.06 a month, the last 558.04).
 * Subscriptions › details shows it beside the monthly installment.
 */
const open = (subscription: Record<string, unknown>) => {
  signIn({ permissions: ['view subscriptions'] })
  allowBackgroundCalls()
  api('get', '/common/subscriptions/1101', {
    status: true,
    data: {
      id: 1101,
      entity_type: 'Borrower',
      subscriber_name: 'Bo Rower',
      status: 'Active',
      enrollment_type: 'Installment',
      installment_type: 1,
      installment_count: 12,
      installments_paid: 4,
      payable_amount: '$7,696.70',
      down_payment: '$1,000.00',
      subscription_amount_per_month: '$558.06',
      ...subscription,
    },
  })
  api('post', '/common/invoices/fetch-invoices', paginated([]))
  renderPage(<SubscriptionDetails />, { path: '/subscriptions/:id', route: '/subscriptions/1101' })
}

describe('Subscription details - the last installment', () => {
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

  it('shows no last installment once the plan is paid off', async () => {
    open({ final_installment_amount: '$558.04', enrollment_completed_at: '2026-10-01' })

    expect(await screen.findByText('Total Plan Amount')).toBeInTheDocument()
    expect(screen.queryByText('Last Installment')).not.toBeInTheDocument()
  })
})

// The subscriber icon sits on the same light tile for every subscriber type,
// as on Payment and Invoice details.
describe('Subscription details - subscriber icon tile', () => {
  it.each(['Partner', 'Borrower', 'User'])('is the neutral tile for a %s', async (entityType) => {
    open({ entity_type: entityType })

    await screen.findByText('Bo Rower')
    const tile = document.querySelector('.card-header .avatar-title') as HTMLElement
    expect(tile).toHaveClass('bg-gray-subtle', 'text-primary')
    expect(tile.className).not.toMatch(/\b(bg|text)-(success|info)(-subtle)?\b/)
  })
})
