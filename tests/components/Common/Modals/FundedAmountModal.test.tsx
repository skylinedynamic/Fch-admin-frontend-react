import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, within } from '../../../test-utils'
// The real Bootstrap modal cannot show under jsdom (it throws on a null style), like the other modal tests.
vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))

import FundedAmountModal from '../../../../src/components/Common/Modals/FundedAmountModal'

/**
 * Closed (Completed): the funded amount and - optional - the commission, set in
 * one place with the Commission Details card's calculation, then saved through
 * its API by the page (onConfirm gets the rates, or null for none).
 */
const base = {
  show: true,
  onHide: vi.fn(),
  loading: false,
  title: 'Status Update: Closed (Completed)',
  initialAmount: '25000',
  requestedAmount: 30000,
}

const fundedInput = () => screen.getByLabelText(/funded amount/i)
const confirm = () => screen.getByRole('button', { name: 'Confirm & Update' })
// A line of the commission summary, by its label.
const row = (label: string) => screen.getByText(label, { exact: false, selector: '[data-row] > span' }).closest('[data-row]') as HTMLElement

describe('FundedAmountModal', () => {
  it('needs a funded amount above zero', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<FundedAmountModal {...base} initialAmount="" onConfirm={onConfirm} canEditCommission />)

    await userEvent.click(confirm())

    expect(screen.getByText('Please enter a valid funded amount')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()

    await userEvent.type(fundedInput(), '10')
    expect(screen.queryByText('Please enter a valid funded amount')).not.toBeInTheDocument()
  })

  it('leaves the commission out when no success fee is given', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<FundedAmountModal {...base} onConfirm={onConfirm} canEditCommission />)

    await userEvent.click(confirm())

    expect(onConfirm).toHaveBeenCalledWith('25000', null)
  })

  it('without a partner, the admin takes the whole success fee on the funded amount', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<FundedAmountModal {...base} onConfirm={onConfirm} canEditCommission />)

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')

    expect(row('Total Requested Amount')).toHaveTextContent('$30,000.00')
    expect(row('Total Funded Amount')).toHaveTextContent('$25,000.00')
    expect(row('Success Fee')).toHaveTextContent('10%')
    expect(row('Admin Commission')).toHaveTextContent('$2,500.00')
    expect(screen.queryByText('Partner Commission')).not.toBeInTheDocument()

    await userEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith('25000', { successFee: '10', adminRate: '', partnerRate: '' })
  })

  /**
   * Defect (SCRUM-434 S434-BUG-06): app 107 (partner client, no commission
   * saved) > Closed (Completed) > Success Fee 10: Admin and Partner both showed
   * 0%, the summary read Admin $0.00 + Partner $0.00 against a $2,000.00 total,
   * and Confirm & Update stopped with "must add up to 100%" until a split was
   * typed. With no saved split the rates start at Admin 100% / Partner 0%
   * (F181), the summary adds up, and Confirm works straight away.
   */
  it('starts a partner application with no saved split at Admin 100% / Partner 0% once a success fee is typed', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<FundedAmountModal {...base} initialAmount="20000" onConfirm={onConfirm} canEditCommission showPartnerCommission />)

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')

    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(100)
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(0)
    expect(row('Total Commission')).toHaveTextContent('$2,000.00')
    expect(row('Admin Commission')).toHaveTextContent('$2,000.00')
    expect(row('Partner Commission')).toHaveTextContent('$0.00')

    await userEvent.click(confirm())
    expect(screen.queryByText('Admin and partner commission rates must add up to 100%.')).not.toBeInTheDocument()
    expect(onConfirm).toHaveBeenCalledWith('20000', { successFee: '10', adminRate: '100', partnerRate: '0' })
  })

  it("starts a partner application with no saved split at the partner's own commission (Partner profile › Commissions)", async () => {
    const onConfirm = vi.fn()
    renderWithProviders(
      <FundedAmountModal {...base} initialAmount="20000" onConfirm={onConfirm} canEditCommission showPartnerCommission defaultPartnerCommissionRate={30} />
    )

    // Still locked and blank until there is a success fee.
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(null)

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')

    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(70)
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(30)
    expect(row('Admin Commission')).toHaveTextContent('$1,400.00')
    expect(row('Partner Commission')).toHaveTextContent('$600.00')

    await userEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith('20000', { successFee: '10', adminRate: '70', partnerRate: '30' })
  })

  it("shows the partner's commission, not a split saved before - the split can't be changed", async () => {
    renderWithProviders(
      <FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission adminCommissionRate={60} partnerCommissionRate={40} defaultPartnerCommissionRate={30} />
    )

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '5')

    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(70)
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(30)
  })

  it("ignores a partner commission on a host client - the admin takes the whole fee", async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<FundedAmountModal {...base} onConfirm={onConfirm} canEditCommission defaultPartnerCommissionRate={30} />)

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')

    expect(screen.queryByLabelText('Partner Commission Rate')).not.toBeInTheDocument()
    expect(row('Admin Commission')).toHaveTextContent('$2,500.00')
  })

  // The admin / partner split comes from the partner's commission (its tier
  // for this deal, else none): read-only, never typed.
  it('shows the admin / partner rates read-only', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<FundedAmountModal {...base} onConfirm={onConfirm} canEditCommission showPartnerCommission />)

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')

    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(100)
    expect(screen.getByLabelText('Admin Commission Rate')).toBeDisabled()
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(0)
    expect(screen.getByLabelText('Partner Commission Rate')).toBeDisabled()
    // Read-only, and styled so: can't be clicked into or tabbed to.
    for (const label of ['Admin Commission Rate', 'Partner Commission Rate']) {
      const input = screen.getByLabelText(label)
      expect(input).toHaveAttribute('readonly')
      expect(input).toHaveAttribute('tabindex', '-1')
      expect(input).toHaveClass('fam-rate--readonly')
    }
    // The Success Fee stays an ordinary field.
    expect(screen.getByLabelText('Success Fee (%)')).not.toHaveClass('fam-rate--readonly')
    expect(screen.getByLabelText('Success Fee (%)')).not.toHaveAttribute('readonly')

    await userEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith('25000', { successFee: '10', adminRate: '100', partnerRate: '0' })
  })

  it('locks the admin / partner rates until a success fee is set, and resets them when it is cleared', async () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission />)
    const fee = screen.getByLabelText('Success Fee (%)')
    const admin = screen.getByLabelText('Admin Commission Rate')
    const partner = screen.getByLabelText('Partner Commission Rate')

    // Default: both blank, and neither can be changed.
    expect(admin).toBeDisabled()
    expect(partner).toBeDisabled()
    expect(admin).toHaveValue(null)
    expect(partner).toHaveValue(null)
    expect(screen.getByText('Set the success fee to split it between admin and partner.')).toBeInTheDocument()

    await userEvent.type(fee, '10')
    // Still read-only: the split is the partner's commission, 100 / 0 with none.
    expect(admin).toBeDisabled()
    expect(partner).toBeDisabled()
    expect(admin).toHaveValue(100)
    expect(partner).toHaveValue(0)

    // Fee cleared: back to blank, locked.
    await userEvent.clear(fee)
    expect(admin).toBeDisabled()
    expect(admin).toHaveValue(null)
    expect(partner).toHaveValue(null)
  })

  /**
   * Defect: a partner application with a 10% success fee and no split yet
   * showed Admin and Partner rates of 0% / 0%, and the summary listed
   * "Admin Commission 0%" and "Partner Commission 0%" against the full total.
   * Never 0% / 0%: before a fee the rates are blank and out of the summary;
   * with a fee they open at 100% / 0% (S434-BUG-06), and the summary adds up.
   */
  it('never shows a 0% / 0% split: blank before a fee, 100% / 0% with one, and the summary adds up', async () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission />)
    const summaryLine = (label: string) => screen.queryByText(label, { exact: false, selector: '[data-row] > span' })

    expect(summaryLine('Admin Commission')).not.toBeInTheDocument()
    expect(summaryLine('Partner Commission')).not.toBeInTheDocument()
    // Blank, not a grey "0" placeholder that reads as 0%.
    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(null)
    expect(screen.getByLabelText('Admin Commission Rate')).not.toHaveAttribute('placeholder')
    expect(screen.getByLabelText('Partner Commission Rate')).not.toHaveAttribute('placeholder')

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')

    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(100)
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(0)
    expect(row('Success Fee')).toHaveTextContent('$2,500.00')
    expect(row('Total Commission')).toHaveTextContent('$2,500.00')
    expect(row('Admin Commission')).toHaveTextContent('$2,500.00')
    expect(row('Partner Commission')).toHaveTextContent('$0.00')
  })

  it('does not take a saved split: with no partner commission the admin keeps it all', async () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission adminCommissionRate={70} partnerCommissionRate={30} />)

    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(null)

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '5')

    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(100)
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(0)
  })

  it('opens read-only at the split when a success fee is already saved', () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission successFeeRate={10} adminCommissionRate={60} partnerCommissionRate={40} />)

    expect(screen.getByLabelText('Admin Commission Rate')).toBeDisabled()
    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(100)
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(0)
  })

  it('for a host client asks only the success fee, all of it to the admin', async () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission />)

    expect(screen.queryByLabelText('Admin Commission Rate')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Partner Commission Rate')).not.toBeInTheDocument()
    expect(screen.queryByText('Admin Commission', { exact: false, selector: '[data-row] > span' })).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '4')

    expect(row('Admin Commission')).toHaveTextContent('$1,000.00')
  })

  /**
   * Defect: with no success fee the summary still listed "Success Fee 0% $0.00"
   * and "Total Commission $0.00". No fee, no commission lines: only the
   * requested and funded amounts, until a success fee is typed.
   */
  it.each([
    ['a partner application', true, ['Success Fee', 'Admin Commission', 'Partner Commission', 'Total Commission']],
    ['a host client', false, ['Success Fee', 'Admin Commission']],
  ])('leaves the commission out of the summary until a success fee is set, for %s', async (_, partnerApp, lines) => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission={partnerApp} />)
    const summaryLine = (label: string) => screen.queryByText(label, { exact: false, selector: '[data-row] > span' })

    expect(row('Total Requested Amount')).toHaveTextContent('$30,000.00')
    expect(row('Total Funded Amount')).toHaveTextContent('$25,000.00')
    for (const line of lines) expect(summaryLine(line)).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')

    expect(row('Success Fee')).toHaveTextContent('$2,500.00')
    expect(row(partnerApp ? 'Total Commission' : 'Admin Commission')).toHaveTextContent('$2,500.00')
  })

  it('does not require the rates while there is no success fee', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<FundedAmountModal {...base} onConfirm={onConfirm} canEditCommission showPartnerCommission />)

    await userEvent.click(confirm())

    expect(screen.queryByText('Admin commission rate is required.')).not.toBeInTheDocument()
    expect(screen.queryByText('Partner commission rate is required.')).not.toBeInTheDocument()
    expect(onConfirm).toHaveBeenCalledWith('25000', null)
  })

  it('sends the split it shows, not a saved one', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(
      <FundedAmountModal {...base} onConfirm={onConfirm} canEditCommission showPartnerCommission successFeeRate={10} adminCommissionRate={40} partnerCommissionRate={50} />
    )

    await userEvent.click(confirm())

    expect(screen.queryByText('Admin and partner commission rates must add up to 100%.')).not.toBeInTheDocument()
    expect(onConfirm).toHaveBeenCalledWith('25000', { successFee: '10', adminRate: '100', partnerRate: '0' })
  })

  it('ignores a rate above 100', async () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission />)

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '150')

    expect(screen.getByLabelText('Success Fee (%)')).toHaveValue(15)
  })

  it('shows the errors the commission API sent back', () => {
    renderWithProviders(
      <FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission successFeeRate={10} commissionErrors={{ total_commission: 'The success fee may not be greater than 100.' }} />
    )

    expect(screen.getByText('The success fee may not be greater than 100.')).toBeInTheDocument()
  })

  it('only shows the commission to someone who cannot set it', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<FundedAmountModal {...base} onConfirm={onConfirm} successFeeRate={10} />)

    expect(screen.queryByLabelText('Success Fee (%)')).not.toBeInTheDocument()
    expect(row('Admin Commission')).toHaveTextContent('$2,500.00')

    await userEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith('25000', null)
  })

  // R3-BUG-076: a partner, or host staff who do not manage commissions, gets no
  // commission money from the API - the modal asks the funded amount only.
  it('leaves the commission out for a viewer the API sends none', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<FundedAmountModal {...base} onConfirm={onConfirm} showsCommission={false} />)

    expect(screen.queryByText('Commission Details')).not.toBeInTheDocument()
    expect(screen.queryByText('No commission is set for this application.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Admin Commission|Success Fee/)).not.toBeInTheDocument()
    expect(row('Total Funded Amount')).toHaveTextContent('$25,000.00')

    await userEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith('25000', null)
  })

  it('says so when someone who cannot set it sees no commission', () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} />)

    expect(screen.getByText('No commission is set for this application.')).toBeInTheDocument()
  })

  it('closes on Cancel, but not while saving', async () => {
    const onHide = vi.fn()
    const { rerender } = renderWithProviders(<FundedAmountModal {...base} onHide={onHide} onConfirm={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onHide).toHaveBeenCalledTimes(1)

    rerender(<FundedAmountModal {...base} onHide={onHide} onConfirm={vi.fn()} loading />)
    // The same Confirm button, saying Processing... with a spinner - not just text.
    const processing = screen.getByRole('button', { name: /processing/i })
    expect(processing).toBeDisabled()
    expect(processing).toHaveClass('btn', 'fam-btn-confirm')
    expect(processing.querySelector('.spinner-border')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('warns that closing locks the application', () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} />)

    const warning = screen.getByText(/closing this application locks it/i)
    expect(within(warning.parentElement as HTMLElement).getByText('Important:')).toBeInTheDocument()
  })
})

// R2 BUG-038: closing an application requested at $12,000 with a funded amount
// of $60,000 gave no warning, though closing locks the application for good.
describe('FundedAmountModal - a funded amount above the requested one', () => {
  const renderModal = (onConfirm = vi.fn()) => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={onConfirm} initialAmount="12000" requestedAmount={12000} />)
    return onConfirm
  }
  const confirmed = () => screen.getByLabelText(/I have checked this amount/i)

  it('closes at or below the requested amount without an extra step', async () => {
    const onConfirm = renderModal()

    expect(screen.queryByText(/above the requested/i)).not.toBeInTheDocument()
    await userEvent.click(confirm())

    expect(onConfirm).toHaveBeenCalledWith('12000', null)
  })

  it('warns above the requested amount and asks for a confirmation first', async () => {
    const onConfirm = renderModal()

    await userEvent.clear(fundedInput())
    await userEvent.type(fundedInput(), '60000')

    expect(screen.getByText(/\$60,000\.00 is above the requested \$12,000\.00/)).toBeInTheDocument()
    expect(confirm()).toBeDisabled()

    await userEvent.click(confirmed())
    expect(confirm()).toBeEnabled()
    await userEvent.click(confirm())

    expect(onConfirm).toHaveBeenCalledWith('60000', null)
  })

  it('asks again when the amount is changed after confirming it', async () => {
    renderModal()
    await userEvent.clear(fundedInput())
    await userEvent.type(fundedInput(), '60000')
    await userEvent.click(confirmed())

    await userEvent.type(fundedInput(), '0')

    expect(confirm()).toBeDisabled()
  })
})

// R2 BUG-036: the Success Fee takes what the API accepts, 1-100%; the admin /
// partner split may still be 0-100.
describe('FundedAmountModal - commission ranges', () => {
  it('limits the Success Fee to 1-100% and the split rates to 0-100%', () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission />)

    const fee = screen.getByLabelText('Success Fee (%)')
    expect(fee).toHaveAttribute('min', '1')
    expect(fee).toHaveAttribute('max', '100')
    expect(fee).toHaveAttribute('step', '0.01')
    expect(screen.getByLabelText('Admin Commission Rate')).toHaveAttribute('min', '0')
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveAttribute('min', '0')
  })

  describe('Partner Commission section', () => {
    const setup = { tiers: [{ id: 1, min_count: 0, max_count: null, percentage: 30 }], deal_position: 3, funded_deal_count: 2 }

    it("shows a partner client's commission tiers", () => {
      renderWithProviders(
        <FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission partnerCommissionSetup={setup} defaultPartnerCommissionRate={30} />
      )

      const panel = screen.getByRole('region', { name: 'Partner Commission' })
      expect(within(panel).getByTestId('partner-commission-rate')).toHaveTextContent('30%')
      expect(within(panel).getByTestId('partner-commission-deal')).toHaveTextContent('Deal #3 · 0+ deals tier')
    })

    it('shows it, saying "Not set", when the partner has none', () => {
      renderWithProviders(
        <FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission partnerCommissionSetup={{ ...setup, tiers: [] }} />
      )

      expect(within(screen.getByRole('region', { name: 'Partner Commission' })).getByText('Not set')).toBeInTheDocument()
    })

    it('links to set partner commissions when none is set', () => {
      renderWithProviders(
        <FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission partnerCommissionSetup={{ ...setup, tiers: [] }} setPartnerCommissionHref="/partners/5?tab=commissions" />
      )

      const panel = screen.getByRole('region', { name: 'Partner Commission' })
      expect(within(panel).getByRole('link', { name: /set partner commissions/i })).toHaveAttribute('href', '/partners/5?tab=commissions')
    })

    it('is not shown for a host client, which has no partner split', () => {
      renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission partnerCommissionSetup={null} />)

      expect(screen.queryByRole('region', { name: 'Partner Commission' })).not.toBeInTheDocument()
    })
  })
})

// Partner profile › Commissions: when the deal falls in one of the partner's
// tiers the admin / partner split comes from it and can't be changed here
// (fch-api sets it from the tier on save).
describe("FundedAmountModal - the split from the partner's tier", () => {
  const setupWith = (tier: Record<string, unknown>) => ({
    tiers: [{ id: 1, min_count: 0, max_count: null, ...tier }],
    deal_position: 1,
    funded_deal_count: 0,
  })
  const percentTier = setupWith({ commission_type: 'percentage', percentage: 30, amount: null })
  const flatTier = (amount: number) => setupWith({ commission_type: 'flat', percentage: null, amount })

  describe('a Percentage tier', () => {
    it('shows its split read-only', async () => {
      renderWithProviders(
        <FundedAmountModal {...base} initialAmount="20000" onConfirm={vi.fn()} canEditCommission showPartnerCommission partnerCommissionSetup={percentTier} defaultPartnerCommissionRate={30} />
      )

      await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')

      expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(30)
      expect(screen.getByLabelText('Partner Commission Rate')).toBeDisabled()
      expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(70)
      expect(screen.getByLabelText('Admin Commission Rate')).toBeDisabled()
      expect(screen.getByText("Set by the partner's commission tier for this deal.")).toBeInTheDocument()
    })

    it('wins over a split saved before', async () => {
      renderWithProviders(
        <FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission adminCommissionRate={60} partnerCommissionRate={40} partnerCommissionSetup={percentTier} defaultPartnerCommissionRate={30} />
      )

      await userEvent.type(screen.getByLabelText('Success Fee (%)'), '5')

      expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(30)
    })
  })

  describe('a Flat Amount tier', () => {
    it('shows the split in $ only, no % rates, and pays exactly the flat amount', async () => {
      const onConfirm = vi.fn()
      renderWithProviders(
        <FundedAmountModal {...base} initialAmount="250000" requestedAmount={250000} onConfirm={onConfirm} canEditCommission showPartnerCommission partnerCommissionSetup={flatTier(500)} />
      )

      // $250,000 x 12% = $30,000: $500 of it is the partner's - not a rounded 1.67% ($501).
      await userEvent.type(screen.getByLabelText('Success Fee (%)'), '12')

      expect(screen.queryByLabelText('Partner Commission Rate')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Admin Commission Rate')).not.toBeInTheDocument()
      expect(row('Partner Commission')).toHaveTextContent('$500.00')
      expect(row('Partner Commission')).toHaveTextContent('Flat amount')
      expect(row('Admin Commission')).toHaveTextContent('$29,500.00')
      expect(screen.queryByText(/of success fee/)).not.toBeInTheDocument()

      await userEvent.click(confirm())
      // The rates still go along; the API sets the exact amount from the tier.
      expect(onConfirm).toHaveBeenCalledWith('250000', { successFee: '12', adminRate: '98.33', partnerRate: '1.67' })
    })

    it('follows the funded amount', async () => {
      renderWithProviders(
        <FundedAmountModal {...base} initialAmount="20000" onConfirm={vi.fn()} canEditCommission showPartnerCommission partnerCommissionSetup={flatTier(500)} />
      )
      await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')
      expect(row('Admin Commission')).toHaveTextContent('$1,500.00')

      await userEvent.clear(fundedInput())
      await userEvent.type(fundedInput(), '50000')

      expect(row('Partner Commission')).toHaveTextContent('$500.00')
      expect(row('Admin Commission')).toHaveTextContent('$4,500.00')
    })

    it('leaves the admin at least 1% when the flat amount is more than the fee', async () => {
      const onConfirm = vi.fn()
      renderWithProviders(
        <FundedAmountModal {...base} initialAmount="20000" onConfirm={onConfirm} canEditCommission showPartnerCommission partnerCommissionSetup={flatTier(5000)} />
      )

      await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')

      expect(row('Partner Commission')).toHaveTextContent('$1,980.00')
      expect(row('Admin Commission')).toHaveTextContent('$20.00')
      await userEvent.click(confirm())
      expect(onConfirm).toHaveBeenCalledWith('20000', { successFee: '10', adminRate: '1', partnerRate: '99' })
    })

    it('wins over a split saved before', async () => {
      renderWithProviders(
        <FundedAmountModal {...base} initialAmount="20000" onConfirm={vi.fn()} canEditCommission showPartnerCommission adminCommissionRate={60} partnerCommissionRate={40} partnerCommissionSetup={flatTier(500)} />
      )

      await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')

      expect(row('Partner Commission')).toHaveTextContent('$500.00')
    })
  })

  it('with no tier for the deal the admin keeps it all, read-only', async () => {
    renderWithProviders(
      <FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission partnerCommissionSetup={{ tiers: [], deal_position: 1, funded_deal_count: 0 }} />
    )

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')

    expect(screen.getByLabelText('Partner Commission Rate')).toBeDisabled()
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(0)
    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(100)
  })
})
