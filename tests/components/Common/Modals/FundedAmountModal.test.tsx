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

    // No split saved yet: all to admin, as the card starts.
    expect(screen.getByLabelText('Admin Commission Rate')).toHaveValue(100)
    expect(screen.getByLabelText('Partner Commission Rate')).toHaveValue(0)

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')
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
