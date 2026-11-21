import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor, within } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import PartnerProfile from '../../../src/pages/partners/PartnerProfile'

/**
 * Partner profile › Configuration › Email Configuration: its Save
 * Configuration button sits in the page header beside Back, like the other
 * tabs' save buttons, and submits the mail form for this partner.
 */
const partner = {
  status: true,
  message: 'ok',
  data: { id: 21, user_id: 77, company_name: 'Sharp Lott Co', email: 'owner@sharp.test', partner_type: 'White-Label Partner (WL)', is_host: false, has_sign: false },
}

const mailConfigurations = (verified: boolean) => ({
  status: true,
  data: {
    configurations: [{
      id: 11, provider: 'smtp', provider_label: 'SMTP', from_address: 'mail@sharp.test', bcc_emails: null,
      smtp_host: 'smtp.sharp.test', is_default: true, is_verified: verified,
      verified_at: null, verified_to: null, updated_at: null,
    }],
    providers: [{ value: 'smtp', label: 'SMTP', fields: [{ key: 'smtp_host', label: 'SMTP Host', type: 'text', required: true, secret: false, options: [] }] }],
    uses_own_configuration: verified,
    fallback: { is_configured: true, is_verified: true },
    can_manage_fallback: false,
  },
})

const openEmailConfiguration = async (verified = false) => {
  signIn({
    is_host: 1,
    permissions: ['view partners', 'update partners', 'manage partner configuration', 'update email configuration settings', 'update sms configuration settings'],
  })
  allowBackgroundCalls()
  api('get', '/admin/partners-details/21', partner)
  api('get', '/common/mail-configurations', mailConfigurations(verified))
  renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/21?tab=configuration' })
  const card = await screen.findByRole('region', { name: 'Email configuration' })
  await waitFor(() => expect(within(card).getByLabelText(/smtp host/i)).toHaveValue('smtp.sharp.test'))
  return card
}

const header = () => screen.getByRole('link', { name: /back/i }).parentElement as HTMLElement

describe('PartnerProfile - Configuration tab, Email Configuration save', () => {
  it('shows Save Configuration in the page header beside Back, not inside the card', async () => {
    const card = await openEmailConfiguration()

    const save = within(header()).getByRole('button', { name: /save configuration/i })
    expect(save).toBeEnabled()
    expect(within(card).queryByRole('button', { name: /save configuration/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /save configuration/i })).toHaveLength(1)
  })

  it('saves this partner\'s mail settings when clicked', async () => {
    await openEmailConfiguration()
    const sent = api('post', '/common/mail-configurations', { status: true, message: 'Saved.' })

    await userEvent.click(within(header()).getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(sent.bodies[0]).toMatchObject({ provider: 'smtp', smtp_host: 'smtp.sharp.test', partner_id: 21 }))
  })

  it('is disabled while verified settings are unchanged, and comes on after an edit', async () => {
    const card = await openEmailConfiguration(true)
    const save = () => within(header()).getByRole('button', { name: /save configuration/i })

    expect(save()).toBeDisabled()
    await userEvent.type(within(card).getByLabelText(/smtp host/i), 'x')
    expect(save()).toBeEnabled()
  })

  it('goes away when another configuration section is opened', async () => {
    await openEmailConfiguration()
    api('get', '/common/sms-configuration', {
      status: true,
      data: { configuration: null, options: { countries: [{ value: 'USA', label: 'United States', providers: [{ value: 'twilio', label: 'Twilio' }] }] } },
    })

    await userEvent.click(screen.getByRole('tab', { name: /sms configuration/i }))
    await screen.findByRole('tab', { name: /sms configuration/i, selected: true })

    // SMS keeps its own button in its form; the header's is the email one only.
    await waitFor(() => expect(within(header()).queryByRole('button', { name: /save configuration/i })).not.toBeInTheDocument())
  })
})
