import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import PartnerInformationSection from '../../../../src/pages/partners/components/PartnerInformationSection'
import { suggestedSubdomain } from '../../../../src/modules/partner/logic'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))

/**
 * Defect (R2 BUG-087, R2-OP-PART-17): Add Partner with company "Partner 1"
 * filled the reserved subdomain "partner" (hint: partner.skylinedynamic.dev),
 * and Save was refused with "The selected partner domain is invalid.". The
 * suggestion now avoids a reserved word on its own - "partner-portal" - and the
 * hint shows that exact URL. "Four Doors 24" still gives "fourdoors".
 */
const renderSection = (formData: Record<string, unknown>, handleInputChange = vi.fn()) => {
  const view = renderWithProviders(
    <PartnerInformationSection
      formData={{ partner_type: '', country: 'United States', contact_person_relation: '', ...formData }}
      errors={{}}
      profileImage={null}
      handleInputChange={handleInputChange}
      countries={[]}
      states={[]}
      cities={[]}
    />
  )
  return { ...view, handleInputChange }
}

describe('Partner information › suggested subdomain', () => {
  beforeEach(() => vi.stubEnv('VITE_WEBSITE_URL', 'https://skylinedynamic.dev/'))
  afterEach(() => vi.unstubAllEnvs())

  it('never suggests a reserved word', () => {
    expect(suggestedSubdomain('Partner 1')).toBe('partner-portal')
    expect(suggestedSubdomain('Admin')).toBe('admin-portal')
    expect(suggestedSubdomain('Four Doors 24')).toBe('fourdoors')
    expect(suggestedSubdomain('')).toBe('')
  })

  it('fills and shows "partner-portal" for company "Partner 1", with the exact URL in the hint', () => {
    const { container, handleInputChange } = renderSection({ company_name: 'Partner 1' })

    expect(handleInputChange).toHaveBeenCalledWith({ target: { name: 'partner_domain', value: 'partner-portal' } })
    expect(screen.getByDisplayValue('partner-portal')).toBeInTheDocument()
    expect(container.querySelector('label code')).toHaveTextContent('partner-portal.skylinedynamic.dev')
  })

  it('keeps an ordinary company name as before', () => {
    const { container } = renderSection({ company_name: 'Four Doors 24' })

    expect(screen.getByDisplayValue('fourdoors')).toBeInTheDocument()
    expect(container.querySelector('label code')).toHaveTextContent('fourdoors.skylinedynamic.dev')
  })
})
