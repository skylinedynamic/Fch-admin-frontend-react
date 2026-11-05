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

  it('splits a partner application admin / partner, each rate filling in the other', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<FundedAmountModal {...base} onConfirm={onConfirm} canEditCommission showPartnerCommission />)

    // No success fee yet: nothing to split, 0% / 0%.
    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(0)
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(0)

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')
    // A success fee and no split saved yet: still 0% / 0% until one is typed.
    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(0)
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(0)
    await userEvent.clear(screen.getByLabelText('Admin Commission Rate'))
    await userEvent.type(screen.getByLabelText('Admin Commission Rate'), '10')

    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(90)
    expect(row('Total Commission')).toHaveTextContent('$2,500.00')
    expect(row('Admin Commission')).toHaveTextContent('$250.00')
    expect(row('Partner Commission')).toHaveTextContent('$2,250.00')

    await userEvent.clear(screen.getByLabelText('Partner Commission Rate'))
    await userEvent.type(screen.getByLabelText('Partner Commission Rate'), '75')
    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(25)

    await userEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith('25000', { successFee: '10', adminRate: '25', partnerRate: '75' })
  })

  it('locks the admin / partner rates until a success fee is set, and resets them when it is cleared', async () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission />)
    const fee = screen.getByLabelText('Success Fee (%)')
    const admin = screen.getByLabelText('Admin Commission Rate')
    const partner = screen.getByLabelText('Partner Commission Rate')

    // Default: 0% / 0%, and neither can be changed.
    expect(admin).toBeDisabled()
    expect(partner).toBeDisabled()
    expect(admin).toHaveValue(0)
    expect(partner).toHaveValue(0)
    expect(row('Admin Commission')).toHaveTextContent('0% of success fee')
    expect(row('Partner Commission')).toHaveTextContent('0% of success fee')
    expect(screen.getByText('Set the success fee to split it between admin and partner.')).toBeInTheDocument()

    await userEvent.type(fee, '10')
    expect(admin).toBeEnabled()
    expect(partner).toBeEnabled()
    expect(admin).toHaveValue(0)
    expect(partner).toHaveValue(0)

    await userEvent.clear(partner)
    await userEvent.type(partner, '30')
    expect(admin).toHaveValue(70)

    // Fee cleared: back to 0% / 0%, locked.
    await userEvent.clear(fee)
    expect(admin).toBeDisabled()
    expect(admin).toHaveValue(0)
    expect(partner).toHaveValue(0)
  })

  it('starts from the saved split once a success fee is set', async () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission adminCommissionRate={70} partnerCommissionRate={30} />)

    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(0)
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(0)

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '5')

    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(70)
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(30)
  })

  it('opens with the saved split when a success fee is already saved', () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission successFeeRate={10} adminCommissionRate={60} partnerCommissionRate={40} />)

    expect(screen.getByLabelText('Admin Commission Rate')).toBeEnabled()
    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(60)
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(40)
  })

  it('for a host client asks only the success fee, all of it to the admin', async () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission />)

    expect(screen.queryByLabelText('Admin Commission Rate')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Partner Commission Rate')).not.toBeInTheDocument()
    expect(row('Admin Commission')).toHaveTextContent('$0.00')

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '4')

    expect(row('Admin Commission')).toHaveTextContent('$1,000.00')
  })

  it('keeps the split at 100% when a rate is cleared', async () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} canEditCommission showPartnerCommission successFeeRate={10} adminCommissionRate={9} partnerCommissionRate={91} />)

    await userEvent.clear(screen.getByLabelText('Admin Commission Rate'))

    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(100)
  })

  it('refuses an admin rate below 1%', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<FundedAmountModal {...base} onConfirm={onConfirm} canEditCommission showPartnerCommission successFeeRate={10} adminCommissionRate={50} partnerCommissionRate={50} />)

    await userEvent.clear(screen.getByLabelText('Partner Commission Rate'))
    await userEvent.type(screen.getByLabelText('Partner Commission Rate'), '100')
    await userEvent.click(confirm())

    expect(screen.getByText('Admin commission rate must be at least 1%.')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('asks for the split when a success fee is set but both rates are still 0%', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(<FundedAmountModal {...base} onConfirm={onConfirm} canEditCommission showPartnerCommission />)

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')
    await userEvent.click(confirm())

    expect(screen.getByText('Admin and partner commission rates must add up to 100%.')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('refuses a split that does not add up to 100%', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(
      <FundedAmountModal {...base} onConfirm={onConfirm} canEditCommission showPartnerCommission successFeeRate={10} adminCommissionRate={40} partnerCommissionRate={50} />
    )

    await userEvent.click(confirm())

    expect(screen.getByText('Admin and partner commission rates must add up to 100%.')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
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
    expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('warns that closing locks the application', () => {
    renderWithProviders(<FundedAmountModal {...base} onConfirm={vi.fn()} />)

    const warning = screen.getByText(/closing this application locks it/i)
    expect(within(warning.parentElement as HTMLElement).getByText('Important:')).toBeInTheDocument()
  })
})
