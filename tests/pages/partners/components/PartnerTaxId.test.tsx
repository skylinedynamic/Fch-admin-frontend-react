import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import PartnerInformationSection from '../../../../src/pages/partners/components/PartnerInformationSection'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))

/**
 * A partner's Tax ID is its EIN: written XX-XXXXXXX, kept by the API as the
 * nine digits. A value that is not an EIN at all (older rows hold free text)
 * is shown as it is, so opening and saving the partner never blanks it.
 */
function Harness({ taxId, partnerId = 9 }: { taxId: string; partnerId?: number }) {
  const [formData, setFormData] = useState<Record<string, unknown>>({ tax_id: taxId, partner_type: '', company_name: 'Acme' })
  const handleInputChange = (e: { target: { name: string; value: unknown } }) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  return (
    <PartnerInformationSection
      formData={formData}
      errors={{}}
      profileImage={null}
      handleInputChange={handleInputChange}
      countries={[]}
      states={[]}
      cities={[]}
      partnerId={partnerId}
    />
  )
}

const taxId = () => screen.getByPlaceholderText('XX-XXXXXXX') as HTMLInputElement

describe('Partner Tax ID', () => {
  it('shows the stored nine digits as XX-XXXXXXX', () => {
    renderWithProviders(<Harness taxId="467346734" />)

    expect(taxId()).toHaveValue('46-7346734')
  })

  it('writes the EIN as XX-XXXXXXX while it is typed', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness taxId="" />)

    await user.type(taxId(), '12a3456789999')

    expect(taxId()).toHaveValue('12-3456789')
  })

  it('shows a value that is not an EIN as it is', () => {
    renderWithProviders(<Harness taxId="Sit tempora nulla" />)

    expect(taxId()).toHaveValue('Sit tempora nulla')
  })
})
