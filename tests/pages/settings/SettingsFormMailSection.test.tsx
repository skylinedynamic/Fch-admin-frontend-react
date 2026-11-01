import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import userEvent from '@testing-library/user-event'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import SettingsForm from '../../../src/pages/settings/components/SettingsForm'

afterEach(() => server.resetHandlers())

describe('Settings menu - Email Configuration', () => {
  it('a mail reply with no data does not take the Settings page down', async () => {
    useAuthStore.setState({
      token: 't',
      // A host partner login: also asks whether to offer Test Mail (SettingsForm's own read).
      user: { id: 1, name: 'Host', entity_type: 'Partner', permissions: ['update email configuration settings', 'send test mail'], partner_id: 1, is_host: 1 },
      userSubscription: null,
    } as never)
    server.use(http.get('*/common/mail-configurations', () => HttpResponse.json({ status: true, data: null })))

    renderWithProviders(<SettingsForm fetching={false} activeSection="email_configuration" setActiveSection={vi.fn()} />)

    expect(await screen.findByText('Failed to load the mail configuration.')).toBeInTheDocument()
  })

  it('opens the mail configuration with its fallback note', async () => {
    useAuthStore.setState({
      token: 't',
      user: { id: 1, name: 'Pat Partner', permissions: ['update email configuration settings'], partner_id: 2, is_host: 0 },
      userSubscription: null,
    } as never)
    server.use(
      http.get('*/common/mail-configurations', () =>
        HttpResponse.json({
          status: true,
          data: {
            configurations: [],
            providers: [{ value: 'smtp', label: 'SMTP', fields: [{ key: 'smtp_host', label: 'SMTP Host', type: 'text', required: true, secret: false, options: [] }] }],
            uses_own_configuration: false,
            fallback: { is_configured: true, is_verified: true },
            can_manage_fallback: false,
          },
        })
      )
    )

    renderWithProviders(<SettingsForm fetching={false} activeSection="email_configuration" setActiveSection={vi.fn()} />)

    expect(await screen.findByText(
      'Until the mail configuration is verified, all mail will be sent using the fallback mail configuration.'
    )).toBeInTheDocument()
  })
})

/**
 * Test Mail sits right under Email Configuration, and only once the partner's
 * own mail configuration is verified - before that there is nothing of its own
 * to test. The Email Configuration card then links to it, beside Save.
 */
describe('Settings menu - Test Mail', () => {
  const signInHostOwner = () =>
    useAuthStore.setState({
      token: 't',
      user: {
        id: 1,
        name: 'Host Owner',
        entity_type: 'Partner',
        is_host: 1,
        partner_id: 1,
        permissions: ['update email configuration settings', 'update branding settings'],
      },
      userSubscription: null,
    } as never)

  const serveMail = (usesOwnConfiguration: boolean) =>
    server.use(
      http.get('*/common/mail-configurations', () =>
        HttpResponse.json({
          status: true,
          data: {
            configurations: [{
              id: 11, provider: 'smtp', provider_label: 'SMTP', from_address: 'mail@acme.test', bcc_emails: null,
              smtp_host: 'smtp.acme.test', is_default: usesOwnConfiguration, is_verified: usesOwnConfiguration,
              verified_at: null, verified_to: null, updated_at: null,
            }],
            providers: [{ value: 'smtp', label: 'SMTP', fields: [{ key: 'smtp_host', label: 'SMTP Host', type: 'text', required: true, secret: false, options: [] }] }],
            uses_own_configuration: usesOwnConfiguration,
            fallback: { is_configured: true, is_verified: true },
            can_manage_fallback: false,
          },
        })
      )
    )

  const menuItems = () =>
    screen.getAllByRole('button').filter((b) => b.classList.contains('list-group-item')).map((b) => b.textContent?.trim())

  it('is hidden until the mail configuration is verified', async () => {
    signInHostOwner()
    serveMail(false)

    renderWithProviders(<SettingsForm fetching={false} activeSection="email_configuration" setActiveSection={vi.fn()} />)

    await screen.findByRole('region', { name: 'Email configuration' })
    expect(menuItems()).not.toContain('Test Mail')
    expect(screen.queryByRole('button', { name: /^test mail$/i })).not.toBeInTheDocument()
  })

  it('appears right under Email Configuration once it is verified', async () => {
    signInHostOwner()
    serveMail(true)

    renderWithProviders(<SettingsForm fetching={false} activeSection="email_configuration" setActiveSection={vi.fn()} />)

    await screen.findByRole('region', { name: 'Email configuration' })
    await waitFor(() => expect(menuItems()).toContain('Test Mail'))
    const items = menuItems()
    expect(items[items.indexOf('Email Configuration') + 1]).toBe('Test Mail')
  })

  it('is reached from a Test Mail button just before Save Configuration', async () => {
    signInHostOwner()
    serveMail(true)
    const setActiveSection = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<SettingsForm fetching={false} activeSection="email_configuration" setActiveSection={setActiveSection} />)

    const card = await screen.findByRole('region', { name: 'Email configuration' })
    const testMail = await within(card).findByRole('button', { name: /^test mail$/i })
    const save = within(card).getByRole('button', { name: /save configuration/i })
    // Directly before Save, in the same row.
    expect(testMail.nextElementSibling).toBe(save)

    await user.click(testMail)
    expect(setActiveSection).toHaveBeenCalledWith('test_mail')
  })
})

/**
 * Once the mail configuration is verified there is nothing to save:
 * Save Configuration stays disabled until a setting is changed (a field
 * edited, a secret typed), and goes back to disabled when the edit is undone.
 * Unverified settings can always be saved.
 */
describe('Settings menu - Save Configuration on verified settings', () => {
  const signIn = () =>
    useAuthStore.setState({
      token: 't',
      user: { id: 1, name: 'Pat Partner', permissions: ['update email configuration settings'], partner_id: 2, is_host: 0 },
      userSubscription: null,
    } as never)

  const serve = (verified: boolean) =>
    server.use(
      http.get('*/common/mail-configurations', () =>
        HttpResponse.json({
          status: true,
          data: {
            configurations: [{
              id: 11, provider: 'smtp', provider_label: 'SMTP', from_address: 'mail@acme.test', bcc_emails: null,
              smtp_host: 'smtp.acme.test', has_smtp_password: true, is_default: true, is_verified: verified,
              verified_at: null, verified_to: null, updated_at: null,
            }],
            providers: [{
              value: 'smtp',
              label: 'SMTP',
              fields: [
                { key: 'smtp_host', label: 'SMTP Host', type: 'text', required: true, secret: false, options: [] },
                { key: 'smtp_password', label: 'SMTP Password', type: 'password', required: true, secret: true, options: [] },
              ],
            }],
            uses_own_configuration: verified,
            fallback: { is_configured: true, is_verified: true },
            can_manage_fallback: false,
          },
        })
      )
    )

  const renderMail = async () => {
    renderWithProviders(<SettingsForm fetching={false} activeSection="email_configuration" setActiveSection={vi.fn()} />)
    const region = await screen.findByRole('region', { name: /mail configuration/i })
    await waitFor(() => expect(within(region).getByLabelText(/smtp host/i)).toHaveValue('smtp.acme.test'))
    return { region, save: () => within(region).getByRole('button', { name: /save configuration/i }) }
  }

  it('is disabled while the verified settings are unchanged', async () => {
    signIn()
    serve(true)
    const { save } = await renderMail()

    expect(save()).toBeDisabled()
  })

  it('comes on once a setting is changed, and goes off again when the change is undone', async () => {
    signIn()
    serve(true)
    const user = userEvent.setup()
    const { region, save } = await renderMail()

    const host = within(region).getByLabelText(/smtp host/i)
    await user.type(host, 'x')
    expect(save()).toBeEnabled()

    await user.type(host, '{Backspace}')
    expect(save()).toBeDisabled()
  })

  it('comes on once a new secret is typed', async () => {
    signIn()
    serve(true)
    const user = userEvent.setup()
    const { region, save } = await renderMail()

    await user.type(within(region).getByLabelText(/smtp password/i), 'n3w-secret')

    expect(save()).toBeEnabled()
  })

  it('stays available while the settings are not verified', async () => {
    signIn()
    serve(false)
    const { save } = await renderMail()

    expect(save()).toBeEnabled()
  })
})
