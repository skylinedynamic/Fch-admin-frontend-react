import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import PartnerConfigurationSection from '../../../src/pages/partners/components/PartnerConfigurationSection'
import { PARTNER_TYPES } from '../../../src/config/partnerTypeOptions'

/**
 * Partner profile › Configuration: the partner's own settings screens, each
 * reading and saving that partner's settings (`partner_id`), not the signed-in
 * host's.
 */
const WHITE_LABEL = {
  id: 42, company_name: 'Acme Lending', partner_type: PARTNER_TYPES.WHITE_LABEL, is_host: 0,
  full_name: 'Wile Coyote', email: 'wile@acme.test', phone_number: '(444) 444-4444', status: 'active',
}
const CERTIFIED = { id: 43, company_name: 'Certified Co', partner_type: PARTNER_TYPES.CERTIFIED, is_host: 0 }

const smsOptions = { countries: [{ value: 'USA', label: 'United States', providers: [{ value: 'twilio', label: 'Twilio' }] }] }
const smsSaved = {
  country: 'USA', provider: 'twilio', is_enabled: true, from_number: '+15005550006',
  account_sid: 'AC0123456789abcdef0123456789abcdef', auth_token: '••••••••', messaging_service_sid: null,
  updated_at: '2026-10-05T10:00:00+00:00',
}

const signInWith = (permissions: string[]) =>
  useAuthStore.setState({ token: 't', user: { id: 1, is_host: 1, entity_type: 'Partner', permissions } as never })

let smsQueries: Array<string | null> = []
let smsSaves: any[] = []
let agreementLists: Array<string | null> = []
let agreementShows: any[] = []
let agreementWrites: Array<{ url: string; body: any }> = []
const borrowerAgreement = { id: 7, slug: 'borrower', is_active: true, template_html: '<p>Acme terms</p>', template_json: null }

beforeEach(() => {
  smsQueries = []
  smsSaves = []
  agreementLists = []
  agreementShows = []
  agreementWrites = []
  signInWith(['update email configuration settings', 'update sms configuration settings', 'update payment settings', 'update partner agreement settings'])
  server.use(
    http.get('*/common/sms-configuration', ({ request }) => {
      smsQueries.push(new URL(request.url).searchParams.get('partner_id'))
      return HttpResponse.json({ status: true, data: { configuration: smsSaved, options: smsOptions } })
    }),
    http.post('*/common/sms-configuration', async ({ request }) => {
      smsSaves.push(await request.json())
      return HttpResponse.json({ status: true, data: { configuration: smsSaved, options: smsOptions } })
    }),
    http.get('*/common/mail-configurations', () =>
      HttpResponse.json({ status: true, data: { configurations: [], uses_own_configuration: false, can_manage_fallback: false, fallback: {}, providers: [] } })
    ),
    http.get('*/common/partner-payment-providers', () => HttpResponse.json({ status: true, data: [] })),
    http.get('*/common/agreement-templates', ({ request }) => {
      agreementLists.push(new URL(request.url).searchParams.get('partner_id'))
      return HttpResponse.json({ status: true, data: [borrowerAgreement] })
    }),
    http.post('*/common/agreement-templates/show', async ({ request }) => {
      agreementShows.push(await request.json())
      return HttpResponse.json({ status: true, data: borrowerAgreement })
    }),
    http.post('*/common/agreement-templates/:action/:id', async ({ request, params }) => {
      agreementWrites.push({ url: `${params.action}/${params.id}`, body: await request.json() })
      return HttpResponse.json({ status: true, message: 'Saved', data: borrowerAgreement })
    })
  )
})

afterEach(() => {
  server.resetHandlers()
  useAuthStore.setState({ token: undefined, user: null })
})

/** The section names in the menu (each item also carries a one-line description). */
const menu = () => screen.getAllByRole('tab').map((tab) => tab.querySelector('.partner-config__menu-label')?.textContent?.trim())

describe('PartnerConfigurationSection', () => {
  it('offers a white-label partner Email, SMS, Branding, Agreement and Payment', () => {
    renderWithProviders(<PartnerConfigurationSection partner={WHITE_LABEL} />)

    expect(menu()).toEqual(['Email Configuration', 'SMS Configuration', 'Branding', 'Agreement', 'Payment Integration'])
  })

  it('does not offer SMS to a user whose role cannot open it - it would answer "no permission"', () => {
    signInWith(['update email configuration settings', 'update payment settings'])
    renderWithProviders(<PartnerConfigurationSection partner={WHITE_LABEL} />)

    expect(menu()).toEqual(['Email Configuration', 'Branding', 'Payment Integration'])
    expect(smsQueries).toEqual([])
  })

  it('says so when the user\'s role cannot change any of the partner\'s settings', () => {
    signInWith([])
    renderWithProviders(<PartnerConfigurationSection partner={CERTIFIED} />)

    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.getByText(/Your role cannot change any of Certified Co's settings/)).toBeInTheDocument()
  })

  it('offers a certified partner Agreement and Payment, saying it uses the host\'s mail, SMS and branding', () => {
    renderWithProviders(<PartnerConfigurationSection partner={CERTIFIED} />)

    expect(menu()).toEqual(['Agreement', 'Payment Integration'])
    expect(screen.getByText(/uses the platform's email, SMS and branding/i)).toHaveTextContent(/Only its agreement and payment settings are its own/)
  })

  it('shows the partner\'s borrower agreement, not the host\'s partner agreement or the global signing switch', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PartnerConfigurationSection partner={WHITE_LABEL} />)

    await user.click(screen.getByRole('tab', { name: /^Agreement/ }))

    expect(await screen.findByText('Borrower Agreement Paper')).toBeInTheDocument()
    expect(screen.queryByText('Partner Agreement Paper')).not.toBeInTheDocument()
    expect(screen.queryByText('Agreement Signing Feature')).not.toBeInTheDocument()
    expect(agreementLists).toEqual(['42'])
  })

  it('turns the partner\'s borrower agreement off and saves its edits, not the host\'s', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PartnerConfigurationSection partner={WHITE_LABEL} />)

    await user.click(screen.getByRole('tab', { name: /^Agreement/ }))
    await user.click(await screen.findByRole('switch'))

    await waitFor(() => expect(agreementWrites).toHaveLength(1))
    expect(agreementWrites[0]).toMatchObject({ url: 'update-status/7', body: { is_active: false, partner_id: 42 } })

    await user.click(screen.getByRole('button', { name: /Edit Agreement/ }))
    await waitFor(() => expect(agreementShows).toEqual([{ slug: 'borrower', partner_id: 42 }]))
    await user.click(await screen.findByRole('button', { name: 'Save Template' }))

    await waitFor(() => expect(agreementWrites).toHaveLength(2))
    expect(agreementWrites[1]).toMatchObject({ url: 'save/7', body: { slug: 'borrower', partner_id: 42 } })
  })

  it('reads and saves the partner\'s SMS configuration, not the host\'s', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PartnerConfigurationSection partner={WHITE_LABEL} />)

    await user.click(screen.getByRole('tab', { name: 'SMS Configuration' }))

    expect(await screen.findByLabelText(/from number/i)).toHaveValue('+15005550006')
    expect(smsQueries).toEqual(['42'])

    await user.clear(screen.getByLabelText(/from number/i))
    await user.type(screen.getByLabelText(/from number/i), '+15005550007')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(smsSaves).toHaveLength(1))
    expect(smsSaves[0]).toMatchObject({ partner_id: 42, from_number: '+15005550007' })
  })

  it('starts with a short summary of the partner whose settings these are', () => {
    renderWithProviders(<PartnerConfigurationSection partner={WHITE_LABEL} />)

    const summary = screen.getByRole('region', { name: 'Partner details' })
    expect(summary).toHaveTextContent('Acme Lending')
    expect(summary).toHaveTextContent('Wile Coyote')
    expect(summary).toHaveTextContent('wile@acme.test')
    expect(summary).toHaveTextContent('(444) 444-4444')
    expect(summary).toHaveTextContent('White-Label')
    expect(summary).toHaveTextContent('Active')
  })

  it('leaves out details the partner does not have', () => {
    renderWithProviders(<PartnerConfigurationSection partner={CERTIFIED} />)

    const summary = screen.getByRole('region', { name: 'Partner details' })
    expect(summary).toHaveTextContent('Certified Co')
    expect(summary).toHaveTextContent('Certified')
    expect(summary).not.toHaveTextContent('undefined')
  })

  it('titles the open section with whose settings they are', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PartnerConfigurationSection partner={WHITE_LABEL} />)

    await user.click(screen.getByRole('tab', { name: /Branding/ }))

    expect(screen.getByRole('heading', { name: 'Branding' })).toBeInTheDocument()
    expect(screen.getByText(/Changes apply to Acme Lending straight away/)).toBeInTheDocument()
  })
})
