import type { ComponentType } from 'react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen, within } from '../../../test-utils'
import SubscriptionListSectionJsx from '../../../../src/pages/partners/components/SubscriptionListSection'

// A .jsx component: its `subscriptions = []` default types the prop as never[].
const SubscriptionListSection = SubscriptionListSectionJsx as ComponentType<{ subscriptions: Record<string, unknown>[] }>

// What PartnerDetailsResource sends per subscription. For an installment plan
// payable_amount is the whole enrollment and total_subscription_amount the
// balance left after the down payment (EnrollmentService).
const installment = {
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
const oneTime = {
  ...installment,
  id: 97,
  enrollment_type: 'One Time Payment',
  total_subscription_amount: '$6,997.00',
  payable_amount: '$6,997.00',
}

const columnIndex = (name: string) =>
  screen.getAllByRole('columnheader').findIndex((h) => h.textContent?.trim().startsWith(name))

const cell = (rowText: string, column: string) => {
  const row = screen.getByText(rowText).closest('tr') as HTMLElement
  return within(row).getAllByRole('cell')[columnIndex(column)]
}

// BUG-126: "Total Amount" showed the balance after the down payment ($6,696.70)
// beside "Payable Amount" $7,696.70 - it read as if the labels were swapped.
describe('Partner profile > Subscription list amounts', () => {
  it('shows the whole enrollment as Total Amount and the rest as Installment Balance', () => {
    renderWithProviders(<SubscriptionListSection subscriptions={[installment]} />)

    expect(columnIndex('Payable Amount')).toBe(-1)
    expect(cell('Installment', 'Total Amount')).toHaveTextContent('$7,696.70')
    expect(cell('Installment', 'Installment Balance')).toHaveTextContent('$6,696.70')
  })

  it('shows no installment balance for a one time payment', () => {
    renderWithProviders(<SubscriptionListSection subscriptions={[oneTime]} />)

    expect(cell('One Time Payment', 'Total Amount')).toHaveTextContent('$6,997.00')
    expect(cell('One Time Payment', 'Installment Balance')).toHaveTextContent('—')
  })
})
