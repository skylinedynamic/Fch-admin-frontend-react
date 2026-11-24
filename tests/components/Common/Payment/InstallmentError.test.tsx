import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InstallmentError } from '../../../../src/components/Common/Payment/InstallmentError'

/**
 * R3-BUG-057: the API's installment errors (enrollment.months and the other
 * enrollment.* installment fields) were mapped to installment_* keys that no
 * field showed, so a refused Save showed nothing.
 */
describe('InstallmentError', () => {
  it('shows the installment months error', () => {
    render(<InstallmentError errors={{ installment_months: 'The enrollment.months field must not be greater than 36.' }} />)

    expect(screen.getByRole('alert')).toHaveTextContent('The enrollment.months field must not be greater than 36.')
  })

  it('shows the first of the other installment errors', () => {
    render(<InstallmentError errors={{ installment_down_payment: 'The down payment must be at least 0.' }} />)

    expect(screen.getByRole('alert')).toHaveTextContent('The down payment must be at least 0.')
  })

  it('shows nothing without an installment error', () => {
    const { container } = render(<InstallmentError errors={{ full_name: 'Name is required', installment_months: null }} />)

    expect(container).toBeEmptyDOMElement()
  })
})
