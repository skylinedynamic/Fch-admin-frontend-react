import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test-utils'
import AddressSection from '../../../../../src/pages/employees/components/form-sections/AddressSection'

/**
 * The API validates an employee's Alternate Mobile (phone_number_2) and Zip
 * Code (postal_code), but the form dropped both messages - an invalid value
 * made the save fail with nothing shown under the field.
 */
const ERRORS: Record<string, string> = {
  phone_number_2: 'Enter a valid 10-digit US phone number, e.g. (555) 234-5678.',
  postal_code: 'Enter a 5-digit ZIP code, e.g. 12345.',
}

const renderSection = (errors: Record<string, string>) =>
  renderWithProviders(
    <AddressSection
      employee={{ country: 'United States', city: 'Austin', phone_number_2: '(1', postal_code: '12' }}
      errors={errors}
      onChange={vi.fn()}
      countries={[]}
      states={[]}
      cities={[]}
    />
  )

describe('Employee address › API errors', () => {
  it.each(Object.entries(ERRORS))('shows the %s error under its field and marks it invalid', (field, message) => {
    const { container } = renderSection({ [field]: message })

    expect(screen.getByText(message)).toBeVisible()
    expect(container.querySelector(`[name="${field}"]`)).toHaveClass('is-invalid')
  })

  it('shows nothing for a field without an error', () => {
    const { container } = renderSection({})

    for (const message of Object.values(ERRORS)) expect(screen.queryByText(message)).not.toBeInTheDocument()
    expect(container.querySelector('.is-invalid')).toBeNull()
  })
})
