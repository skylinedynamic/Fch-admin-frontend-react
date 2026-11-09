import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { PARTNER_TYPES } from '../../../../src/config/partnerTypeOptions'
import PartnerInformationSection from '../../../../src/pages/partners/components/PartnerInformationSection'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))

/**
 * The API saves a partner's domain as <subdomain>.<BASE_WEBSITE>, so the form
 * shows the website's host after the subdomain, not the partner portal's.
 */
const renderSection = (formData: Record<string, unknown>, partnerId?: number) =>
  renderWithProviders(
    <PartnerInformationSection
      formData={{ partner_type: '', country: 'United States', contact_person_relation: '', ...formData }}
      errors={{}}
      profileImage={null}
      handleInputChange={vi.fn()}
      countries={[]}
      states={[]}
      cities={[]}
      partnerId={partnerId}
    />
  )

describe('Partner information › subdomain suffix', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_WEBSITE_URL', 'https://fourcornerfunding.com/')
    vi.stubEnv('VITE_BASE_URL', 'https://partner.fourcornerfunding.com/')
  })

  afterEach(() => vi.unstubAllEnvs())

  it('shows the website host beside the field when creating a partner', () => {
    renderSection({})

    expect(screen.getByText('.fourcornerfunding.com')).toBeInTheDocument()
    expect(screen.queryByText('.partner.fourcornerfunding.com')).not.toBeInTheDocument()
  })

  it('shows the website host beside the field when editing a certified partner', () => {
    renderSection({ partner_type: PARTNER_TYPES.CERTIFIED, partner_domain: 'acme.fourcornerfunding.com' }, 9)

    expect(screen.getByText('.fourcornerfunding.com')).toBeInTheDocument()
  })

  it('uses the same host in the portal url hint', () => {
    const { container } = renderSection({ company_name: 'Acme Funding' })

    expect(container.querySelector('label code')).toHaveTextContent('acmefunding.fourcornerfunding.com')
  })

  it('uses the same host in the hint once a subdomain is typed', () => {
    const { container } = renderSection({ company_name: 'Acme Funding', partner_domain: 'acme' })

    expect(container.querySelector('label code')).toHaveTextContent('acme.fourcornerfunding.com')
  })
})
