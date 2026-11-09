import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen } from '../../../test-utils'
import ClosedApplicationSummary from '../../../../src/pages/applications/funding/components/ClosedApplicationSummary'

/**
 * Closed (Completed) summary on the funding application details page: the
 * host sees requested, funded and the whole commission; a partner sees only
 * their own commission.
 */
const closed = {
  id: 21,
  status: 'Closed (Completed)',
  total_funded_amount: '100000.00',
  funded_date: '2026-11-02',
  total_commission: '10.00',
  admin_commission: '40.00',
  partner_commission: '60.00',
  total_commission_amount: '10000.00',
  admin_commission_amount: '4000.00',
  partner_commission_amount: '6000.00',
  payment_status: 'Unpaid',
} as never

const row = (label: string) => screen.getByText(label, { exact: false, selector: '[data-row] > span' }).closest('[data-row]') as HTMLElement

describe('ClosedApplicationSummary - host', () => {
  it("shows what was requested, what was funded and when, and the whole commission on a partner's application", () => {
    renderWithProviders(<ClosedApplicationSummary app={closed} viewer="host" partnerApplication requestedAmount={120000} />)

    expect(screen.getByText('Funding Completed')).toBeInTheDocument()
    expect(screen.getByText(/Funded on Nov 2, 2026/)).toBeInTheDocument()
    expect(screen.getByText('Total Requested Amount').nextElementSibling).toHaveTextContent('$120,000.00')
    expect(screen.getByText('Total Funded Amount').nextElementSibling).toHaveTextContent('$100,000.00')
    expect(row('Success Fee')).toHaveTextContent('10%')
    expect(row('Success Fee')).toHaveTextContent('$10,000.00')
    expect(row('Admin Commission')).toHaveTextContent('40% of success fee')
    expect(row('Admin Commission')).toHaveTextContent('$4,000.00')
    expect(row('Partner Commission')).toHaveTextContent('60% of success fee')
    expect(row('Partner Commission')).toHaveTextContent('$6,000.00')
  })

  it("leaves out the partner line on the host's own client", () => {
    renderWithProviders(<ClosedApplicationSummary app={closed} viewer="host" partnerApplication={false} requestedAmount={120000} />)

    expect(screen.queryByText(/Partner Commission/)).not.toBeInTheDocument()
  })

  it('says so when no commission was set', () => {
    renderWithProviders(
      <ClosedApplicationSummary app={{ ...(closed as object), total_commission: null, funded_date: null } as never} viewer="host" partnerApplication requestedAmount={0} />
    )

    expect(screen.getByText('No commission was set for this application.')).toBeInTheDocument()
    expect(screen.getByText('Closed (Completed)')).toBeInTheDocument()
    expect(screen.getByText('Total Requested Amount').nextElementSibling).toHaveTextContent('$0.00')
  })
})

describe('ClosedApplicationSummary - partner', () => {
  it('shows requested, funded and their own commission - no host figures', () => {
    renderWithProviders(<ClosedApplicationSummary app={closed} viewer="partner" partnerApplication={false} requestedAmount={120000} />)

    expect(screen.getByText('Partner Commission Details')).toBeInTheDocument()
    expect(screen.getByText('Total Requested Amount').nextElementSibling).toHaveTextContent('$120,000.00')
    expect(screen.getByText('Total Funded Amount').nextElementSibling).toHaveTextContent('$100,000.00')
    expect(screen.getByText('$6,000.00')).toBeInTheDocument()
    expect(screen.getByText(/60% of the success fee/)).toBeInTheDocument()
    expect(screen.getByText('Payment: Unpaid')).toBeInTheDocument()
    expect(screen.queryByText(/Success Fee/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Admin Commission/)).not.toBeInTheDocument()
    expect(screen.queryByText('$10,000.00')).not.toBeInTheDocument()
    expect(screen.queryByText('$4,000.00')).not.toBeInTheDocument()
  })

  it('says so when they have no commission', () => {
    renderWithProviders(
      <ClosedApplicationSummary app={{ ...(closed as object), partner_commission_amount: '0.00', payment_status: null } as never} viewer="partner" partnerApplication={false} requestedAmount={0} />
    )

    expect(screen.getByText('No partner commission was set for this application.')).toBeInTheDocument()
  })

  it('reads amounts given formatted or as numbers, and ignores what is not one', () => {
    renderWithProviders(
      <ClosedApplicationSummary app={{ ...(closed as object), partner_commission_amount: '$6,000.00', partner_commission: 'n/a', funded_date: 'not-a-date' } as never} viewer="partner" partnerApplication={false} requestedAmount={0} />
    )

    expect(screen.getByText('$6,000.00')).toBeInTheDocument()
    expect(screen.getByText(/0% of the success fee/)).toBeInTheDocument()
    expect(screen.queryByText(/Funded on/)).not.toBeInTheDocument()
  })
})
