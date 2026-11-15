import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import PartnerCommissionPanel from '../../../../src/components/Common/Modals/PartnerCommissionPanel'

/**
 * The Closed (Completed) modal's Partner Commission strip: the partner's rate
 * for this deal (its Funding tier, Partner profile › Commissions), or "Not set".
 */
const TIERS = [
  { id: 1, min_count: 0, max_count: 10, percentage: 10 },
  { id: 2, min_count: 11, max_count: 20, percentage: 12.5 },
  { id: 3, min_count: 21, max_count: null, percentage: 15 },
]

describe('PartnerCommissionPanel', () => {
  it("shows only this deal's tier and its rate", () => {
    render(<PartnerCommissionPanel setup={{ tiers: TIERS, deal_position: 12, funded_deal_count: 11 }} />)

    const panel = screen.getByRole('region', { name: 'Partner Commission' })
    expect(within(panel).getByTestId('partner-commission-rate')).toHaveTextContent('12.5%of success fee')
    expect(within(panel).getByTestId('partner-commission-deal')).toHaveTextContent('Deal #12 · 11–20 deals tier')
    // Only the tier that applies, not the whole list.
    expect(within(panel).queryByText('10%')).not.toBeInTheDocument()
    expect(within(panel).queryByText('15%')).not.toBeInTheDocument()
  })

  it('says when the partner has no commission set', () => {
    render(<PartnerCommissionPanel setup={{ tiers: [], deal_position: 1, funded_deal_count: 0 }} />)

    const panel = screen.getByRole('region', { name: 'Partner Commission' })
    expect(within(panel).getByText('Not set')).toBeInTheDocument()
    expect(within(panel).getByTestId('partner-commission-deal')).toHaveTextContent(
      'No commission is set for this partner. Set the Partner Commission Rate manually below.'
    )
    expect(within(panel).queryByTestId('partner-commission-rate')).not.toBeInTheDocument()
  })

  it('says when this deal is past the last tier', () => {
    render(<PartnerCommissionPanel setup={{ tiers: [{ min_count: 0, max_count: 5, percentage: 10 }], deal_position: 9, funded_deal_count: 8 }} />)

    expect(screen.getByTestId('partner-commission-deal')).toHaveTextContent(
      'No commission is set for deal #9 (past the last tier). Set the Partner Commission Rate manually below.'
    )
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })
})
