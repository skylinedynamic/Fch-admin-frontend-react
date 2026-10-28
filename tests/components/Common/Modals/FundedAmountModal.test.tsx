import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import FundedAmountModal from '../../../../src/components/Common/Modals/FundedAmountModal'

vi.mock('bootstrap/js/dist/modal', () => ({ default: class { show() {} hide() {} dispose() {} } }))

// R2 BUG-046: closing an application requested at $12,000 with a funded amount
// of $60,000 gave no warning, though closing locks the application for good.
describe('FundedAmountModal', () => {
  const renderModal = (onConfirm = vi.fn()) => {
    render(<FundedAmountModal show onHide={() => {}} onConfirm={onConfirm} loading={false} initialAmount="12000" requestedAmount={12000} />)
    return onConfirm
  }
  const amountInput = () => screen.getByLabelText('Funded Amount ($)')
  const confirm = () => screen.getByRole('button', { name: 'Confirm & Update', hidden: true })

  it('closes at or below the requested amount without an extra step', () => {
    const onConfirm = renderModal()

    expect(screen.queryByText(/above the requested/i)).not.toBeInTheDocument()
    fireEvent.click(confirm())

    expect(onConfirm).toHaveBeenCalledWith('12000')
  })

  it('warns above the requested amount and asks for a confirmation first', () => {
    const onConfirm = renderModal()

    fireEvent.change(amountInput(), { target: { value: '60000' } })

    expect(screen.getByText(/\$60,000\.00 is above the requested \$12,000\.00/)).toBeInTheDocument()
    expect(confirm()).toBeDisabled()

    fireEvent.click(screen.getByLabelText(/I have checked this amount/i))
    expect(confirm()).toBeEnabled()
    fireEvent.click(confirm())

    expect(onConfirm).toHaveBeenCalledWith('60000')
  })

  it('asks again when the amount is changed after confirming it', () => {
    renderModal()
    fireEvent.change(amountInput(), { target: { value: '60000' } })
    fireEvent.click(screen.getByLabelText(/I have checked this amount/i))

    fireEvent.change(amountInput(), { target: { value: '70000' } })

    expect(confirm()).toBeDisabled()
  })
})
