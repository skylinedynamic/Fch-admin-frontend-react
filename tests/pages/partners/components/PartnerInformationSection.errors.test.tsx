import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import PartnerInformationSection from '../../../../src/pages/partners/components/PartnerInformationSection'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))

/**
 * Every field the partner API validates shows its message under the field and
 * is marked invalid. Tax ID, website, joining date, zip code and the whole
 * Secondary Contact block used to drop theirs silently - the save then did
 * nothing visible.
 */
const ERRORS: Record<string, string> = {
  tax_id: 'Enter a 9-digit EIN as XX-XXXXXXX, e.g. 12-3456789.',
  postal_code: 'Enter a 5-digit ZIP code, e.g. 12345.',
  website: 'The website must be a string.',
  joining_date: 'The joining date is not a valid date.',
  contact_person: 'The name may not be greater than 255 characters.',
  contact_person_phone_number: 'Enter a valid 10-digit US phone number, e.g. (555) 234-5678.',
  contact_person_email: 'The contact person email must be a valid email address.',
  contact_person_relation: 'The relation may not be greater than 255 characters.',
}

const renderSection = (errors: Record<string, string>) =>
  renderWithProviders(
    <PartnerInformationSection
      formData={{ partner_type: '', company_name: 'Acme', country: 'United States', contact_person_relation: '' }}
      errors={errors}
      profileImage={null}
      handleInputChange={vi.fn()}
      countries={[]}
      states={[]}
      cities={[]}
      partnerId={9}
    />
  )

describe('Partner information › API errors', () => {
  it.each(Object.entries(ERRORS))('shows the %s error under its field', (field, message) => {
    const { container } = renderSection({ [field]: message })

    expect(screen.getByText(message)).toBeVisible()
    // The field itself is marked, so the save scrolls to it.
    expect(container.querySelector('.is-invalid, .p-invalid')).not.toBeNull()
  })

  it('marks the text inputs themselves invalid', () => {
    const { container } = renderSection(ERRORS)

    for (const name of ['tax_id', 'postal_code', 'website', 'contact_person', 'contact_person_phone_number', 'contact_person_email']) {
      expect(container.querySelector(`[name="${name}"]`)).toHaveClass('is-invalid')
    }
  })

  it('shows nothing for a field without an error', () => {
    renderSection({})

    for (const message of Object.values(ERRORS)) {
      expect(screen.queryByText(message)).not.toBeInTheDocument()
    }
  })
})
