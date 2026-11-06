import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test-utils'
import PersonalInfoSection from '../../../../../src/pages/employees/components/form-sections/PersonalInfoSection'
import PartnerInformationSection from '../../../../../src/pages/partners/components/PartnerInformationSection'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))

/**
 * BUG-014 (QA round 2): a picture may now be up to 5 MB - the API's limit for
 * any image (config/uploads.php). The employee and partner picture notes still
 * said 1 MB.
 */
const NOTE = 'Allowed image types: JPG, JPEG, PNG (Maximum size: 5 MB).'

describe('Picture size note', () => {
  it('says 5 MB on the employee form', () => {
    renderWithProviders(
      <PersonalInfoSection
        employee={{ country: 'United States' }}
        errors={{}}
        onChange={vi.fn()}
        departments={[]}
        onAddDepartment={vi.fn()}
        countryCodeOptions={[]}
        phonePrefix="+1"
        onPhonePrefixChange={vi.fn()}
        onOpenFileManager={vi.fn()}
        profileImage={null}
        employeeId={null}
      />
    )

    expect(screen.getByText(NOTE)).toBeInTheDocument()
  })

  it('says 5 MB on the partner form', () => {
    renderWithProviders(
      <PartnerInformationSection
        formData={{ partner_type: '', company_name: 'Acme', country: 'United States', contact_person_relation: '' }}
        errors={{}}
        profileImage={null}
        handleInputChange={vi.fn()}
        countries={[]}
        states={[]}
        cities={[]}
        partnerId={9}
      />
    )

    expect(screen.getByText(NOTE)).toBeInTheDocument()
  })
})
