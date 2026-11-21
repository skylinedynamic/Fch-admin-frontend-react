import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen } from '../../../test-utils'
import SubscriptionDetailsSection from '../../../../src/pages/partners/components/SubscriptionDetailsSection'
import type { PartnerSubscription } from '../../../../src/modules/partner/types'

/**
 * Partner profile › Subscription: a partner has one subscription (fch-api
 * saves it with updateOrCreate on the partner), so it is shown as its details,
 * not as a one-row table.
 */

// What PartnerDetailsResource sends per subscription. For an installment plan
// payable_amount is the whole enrollment and total_subscription_amount the
// balance left after the down payment (EnrollmentService).
const installment: PartnerSubscription = {
  id: 170,
  partner_type: 'White-Label Partner (WL)',
  enrollment_type: 'Installment',
  total_subscription_amount: '$6,696.70',
  payable_amount: '$7,696.70',
  monthly_platform_fee: '$399.00',
  subscription_start_date: '2026-10-21',
  subscription_end_date: '2026-11-21',
  status: 'Active',
}
const oneTime: PartnerSubscription = {
  ...installment,
  id: 97,
  enrollment_type: 'One Time Payment',
  total_subscription_amount: '$6,997.00',
  payable_amount: '$6,997.00',
  subscription_start_date: null,
  subscription_end_date: null,
}

/** The value shown under a label. */
const value = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling

describe('Partner profile › Subscription details', () => {
  it('shows the subscription as details, not a table', () => {
    renderWithProviders(<SubscriptionDetailsSection subscriptions={[installment]} />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(value('Partner Type')).toHaveTextContent('White-Label Partner (WL)')
    expect(value('Enrollment Type')).toHaveTextContent('Installment')
    expect(value('Platform Fee')).toHaveTextContent('$399.00')
    expect(value('Start Date')).toHaveTextContent('2026-10-21')
    expect(value('End Date')).toHaveTextContent('2026-11-21')
    expect(value('Status')).toHaveTextContent('Active')
  })

  // BUG-126: "Total Amount" showed the balance after the down payment ($6,696.70)
  // beside "Payable Amount" $7,696.70 - it read as if the labels were swapped.
  it('shows the whole enrollment as Total Amount and the rest as Installment Balance', () => {
    renderWithProviders(<SubscriptionDetailsSection subscriptions={[installment]} />)

    expect(screen.queryByText('Payable Amount')).not.toBeInTheDocument()
    expect(value('Total Amount')).toHaveTextContent('$7,696.70')
    expect(value('Installment Balance')).toHaveTextContent('$6,696.70')
  })

  it('shows no installment balance for a one time payment, and a dash for a missing date', () => {
    renderWithProviders(<SubscriptionDetailsSection subscriptions={[oneTime]} />)

    expect(value('Total Amount')).toHaveTextContent('$6,997.00')
    expect(screen.queryByText('Installment Balance')).not.toBeInTheDocument()
    expect(value('Start Date')).toHaveTextContent('—')
    expect(screen.queryByText('Null')).not.toBeInTheDocument()
  })

  it('shows the latest one if an old partner still has more than one', () => {
    renderWithProviders(<SubscriptionDetailsSection subscriptions={[installment, oneTime]} />)

    expect(value('Enrollment Type')).toHaveTextContent('Installment')
  })

  it('says so when the partner has no subscription', () => {
    renderWithProviders(<SubscriptionDetailsSection subscriptions={[]} />)

    expect(screen.getByText('No subscription found')).toBeInTheDocument()
  })
})
