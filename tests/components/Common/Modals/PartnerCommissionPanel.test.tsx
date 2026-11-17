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
      'No commission is set for this partner, so the admin keeps the whole success fee.'
    )
    expect(within(panel).queryByTestId('partner-commission-rate')).not.toBeInTheDocument()
  })

  it('says when this deal is past the last tier', () => {
    render(<PartnerCommissionPanel setup={{ tiers: [{ min_count: 0, max_count: 5, percentage: 10 }], deal_position: 9, funded_deal_count: 8 }} />)

    expect(screen.getByTestId('partner-commission-deal')).toHaveTextContent(
      'No commission is set for deal #9 (past the last tier), so the admin keeps the whole success fee.'
    )
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })
})

// With no tier for the deal, a link to Partner profile › Commissions to set one.
describe('PartnerCommissionPanel - Set partner commissions link', () => {
  const HREF = '/partners/5?tab=commissions'

  it("links to the partner's Commissions tab, in a new tab, when none is set", () => {
    render(<PartnerCommissionPanel setup={{ tiers: [], deal_position: 1, funded_deal_count: 0 }} setCommissionHref={HREF} />)

    const link = within(screen.getByRole('region', { name: 'Partner Commission' })).getByRole('link', { name: /set partner commissions/i })
    expect(link).toHaveAttribute('href', HREF)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('links there too when this deal is past the last tier', () => {
    render(<PartnerCommissionPanel setup={{ tiers: [{ min_count: 0, max_count: 5, percentage: 10 }], deal_position: 9, funded_deal_count: 8 }} setCommissionHref={HREF} />)

    expect(screen.getByRole('link', { name: /set partner commissions/i })).toHaveAttribute('href', HREF)
  })

  it('has no link when a tier applies', () => {
    render(<PartnerCommissionPanel setup={{ tiers: TIERS, deal_position: 3, funded_deal_count: 2 }} setCommissionHref={HREF} />)

    expect(screen.queryByRole('link', { name: /set partner commissions/i })).not.toBeInTheDocument()
  })

  it('has no link when the user may not set commissions (no href)', () => {
    render(<PartnerCommissionPanel setup={{ tiers: [], deal_position: 1, funded_deal_count: 0 }} />)

    expect(screen.getByText('Not set')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

// A Flat Amount tier is a fixed $ for the deal.
describe('PartnerCommissionPanel - Flat Amount tier', () => {
  const MIXED = [
    { id: 1, min_count: 0, max_count: 10, commission_type: 'percentage' as const, percentage: 10, amount: null },
    { id: 2, min_count: 11, max_count: null, commission_type: 'flat' as const, percentage: null, amount: 1250.5 },
  ]

  it("shows this deal's flat amount", () => {
    render(<PartnerCommissionPanel setup={{ tiers: MIXED, deal_position: 12, funded_deal_count: 11 }} />)

    const panel = screen.getByRole('region', { name: 'Partner Commission' })
    expect(within(panel).getByTestId('partner-commission-rate')).toHaveTextContent('$1,250.50flat per deal')
    expect(within(panel).getByTestId('partner-commission-deal')).toHaveTextContent('Deal #12 · 11+ deals tier')
  })

  it("shows a percentage tier's rate when the deal falls there", () => {
    render(<PartnerCommissionPanel setup={{ tiers: MIXED, deal_position: 3, funded_deal_count: 2 }} />)

    expect(screen.getByTestId('partner-commission-rate')).toHaveTextContent('10%of success fee')
  })
})
