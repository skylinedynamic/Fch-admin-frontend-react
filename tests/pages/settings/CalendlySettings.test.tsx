import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { api } from '../pageHarness'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import SettingsForm from '../../../src/pages/settings/components/SettingsForm'
import CalendlySettings from '../../../src/pages/settings/components/CalendlySettings'
import { ConfigPartnerProvider } from '../../../src/modules/settings/configPartner'
import { sectionFromSlug, settingsPath } from '../../../src/config/settingsSections'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import { toast } from 'react-toastify'

const STATUS = '/common/calendly/status'
const SETTINGS = '/common/calendly/settings'
const status = (data: Record<string, unknown>) => ({ status: true, data: { configured: true, connected: false, can_manage: true, can_sync: false, can_book: false, ...data } })
const settings = (data: Record<string, unknown> = {}) => ({
  status: true,
  data: {
    partner_id: 2,
    client_id: 'CLIENT-ID',
    has_client_secret: true,
    has_webhook_signing_key: true,
    configured: true,
    connected: false,
    needs_reconnect: false,
    redirect_uri: 'https://api.example.test/api/v1/calendly/callback',
    scopes: ['users:read', 'webhooks:write'],
    ...data,
  },
})

beforeEach(() => vi.clearAllMocks())
afterEach(() => server.resetHandlers())

/**
 * Settings > Calendly: where the host, WLP or certified partner account itself
 * sees and changes its Calendly app keys (Client ID, Client Secret, Webhook
 * Signing Key). Connecting the account is on Appointments. Its staff and
 * users never see it.
 */
describe('Settings menu - Calendly', () => {
  const renderMenu = () => {
    useAuthStore.setState({ token: 't', user: { id: 1, name: 'Pat', permissions: [], partner_id: 2, is_host: 0 }, userSubscription: null } as never)
    server.use(http.get('*/common/mail-configurations', () => HttpResponse.json({ status: true, data: { configurations: [], providers: [], uses_own_configuration: false } })))
    api('get', SETTINGS, settings())
    return renderWithProviders(<SettingsForm fetching={false} activeSection="calendly" setActiveSection={vi.fn()} />)
  }

  it('lives at /settings/calendly', () => {
    expect(settingsPath('calendly')).toBe('/settings/calendly')
    expect(sectionFromSlug('calendly')).toBe('calendly')
  })

  it('is listed for the host, WLP or certified partner account itself', async () => {
    api('get', STATUS, status({ can_manage: true }))

    renderMenu()

    expect(await screen.findByRole('button', { name: 'Calendly' })).toBeInTheDocument()
  })

  it('is listed before any keys are saved - that is where they are entered', async () => {
    api('get', STATUS, status({ configured: false, can_manage: true }))

    renderMenu()

    expect(await screen.findByRole('button', { name: 'Calendly' })).toBeInTheDocument()
  })

  it('is hidden from staff and other users', async () => {
    const seen = api('get', STATUS, status({ can_manage: false, can_sync: true, connected: true }))

    renderMenu()

    await waitFor(() => expect(seen.calls).toBeGreaterThan(0))
    expect(screen.queryByRole('button', { name: 'Calendly' })).not.toBeInTheDocument()
  })
})

describe('CalendlySettings', () => {
  it('shows the Client ID, and a saved secret only as a stand-in - as OpenAI Configuration', async () => {
    api('get', SETTINGS, settings())

    renderWithProviders(<CalendlySettings />)

    expect(await screen.findByLabelText(/^client id/i)).toHaveValue('CLIENT-ID')
    const secret = screen.getByLabelText(/client secret/i)
    const key = screen.getByLabelText(/webhook signing key/i)
    // A stand-in, not the secret (the API never sends it): dots only.
    expect((secret as HTMLInputElement).value).toMatch(/^•+$/)
    expect((key as HTMLInputElement).value).toMatch(/^•+$/)
    expect(secret).toHaveAttribute('type', 'password')
    expect(key).toHaveAttribute('type', 'password')
    expect(secret).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByText(/A Client Secret is already stored, encrypted, on the server/)).toBeInTheDocument()
    // Nothing changed yet: nothing to save.
    expect(screen.getByRole('button', { name: /save keys/i })).toBeDisabled()
    expect(screen.getByText('https://api.example.test/api/v1/calendly/callback')).toBeInTheDocument()
  })

  it('masks the Client ID until the eye button shows it - as the Agent IDs on OpenAI Configuration', async () => {
    const user = userEvent.setup()
    api('get', SETTINGS, settings())

    renderWithProviders(<CalendlySettings />)

    const clientId = await screen.findByLabelText(/^client id/i)
    expect(clientId).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show Client ID' }))
    expect(clientId).toHaveAttribute('type', 'text')
    expect(clientId).toHaveValue('CLIENT-ID')
    await user.click(screen.getByRole('button', { name: 'Hide Client ID' }))
    expect(clientId).toHaveAttribute('type', 'password')
  })

  it('a blank secret keeps the saved one', async () => {
    const user = userEvent.setup()
    api('get', SETTINGS, settings())
    let body: Record<string, unknown> | null = null
    server.use(http.post('*/common/calendly/settings', async ({ request }) => {
      body = (await request.json()) as Record<string, unknown>
      return HttpResponse.json(settings({ client_id: 'OTHER-ID' }))
    }))

    renderWithProviders(<CalendlySettings />)

    const clientId = await screen.findByLabelText(/^client id/i)
    await user.clear(clientId)
    await user.type(clientId, 'OTHER-ID')
    await user.click(screen.getByRole('button', { name: /save keys/i }))

    await waitFor(() => expect(body).toEqual({ client_id: 'OTHER-ID', client_secret: '', webhook_signing_key: '' }))
  })

  it('saves changed keys', async () => {
    const user = userEvent.setup()
    api('get', SETTINGS, settings())
    let body: Record<string, unknown> | null = null
    server.use(http.post('*/common/calendly/settings', async ({ request }) => {
      body = (await request.json()) as Record<string, unknown>
      return HttpResponse.json(settings())
    }))

    renderWithProviders(<CalendlySettings />)

    const secret = await screen.findByLabelText(/client secret/i)
    await user.type(secret, 'NEW-SECRET')
    const key = screen.getByLabelText(/webhook signing key/i)
    await user.type(key, 'NEW-KEY')
    await user.click(screen.getByRole('button', { name: /save keys/i }))

    await waitFor(() => expect(body).toEqual({ client_id: 'CLIENT-ID', client_secret: 'NEW-SECRET', webhook_signing_key: 'NEW-KEY' }))
    expect(toast.success).toHaveBeenCalledWith('Calendly settings saved')
    // Saved: the stand-in again - the new secret is not kept on the page.
    await waitFor(() => expect((secret as HTMLInputElement).value).toMatch(/^•+$/))
  })

  it('the host configures a partner: every call names that partner', async () => {
    const user = userEvent.setup()
    let asked: string | null = null
    server.use(http.get('*/common/calendly/settings', ({ request }) => {
      asked = new URL(request.url).searchParams.get('partner_id')
      return HttpResponse.json(settings({ partner_id: 9 }))
    }))
    let saved: Record<string, unknown> | null = null
    server.use(http.post('*/common/calendly/settings', async ({ request }) => {
      saved = (await request.json()) as Record<string, unknown>
      return HttpResponse.json(settings({ partner_id: 9, client_id: 'PARTNER-APP' }))
    }))

    renderWithProviders(
      <ConfigPartnerProvider partner={{ id: 9, company_name: 'Acme' }}>
        <CalendlySettings />
      </ConfigPartnerProvider>,
    )

    const clientId = await screen.findByLabelText(/^client id/i)
    expect(asked).toBe('9')
    await user.clear(clientId)
    await user.type(clientId, 'PARTNER-APP')
    await user.click(screen.getByRole('button', { name: /save keys/i }))

    await waitFor(() => expect(saved).toMatchObject({ partner_id: 9, client_id: 'PARTNER-APP' }))
  })

  it('shows the API\'s message for a refused field', async () => {
    const user = userEvent.setup()
    api('get', SETTINGS, settings({ client_id: null, has_client_secret: false, has_webhook_signing_key: false, configured: false }))
    server.use(http.post('*/common/calendly/settings', () => HttpResponse.json(
      { status: false, message: 'Enter the Client Secret of your Calendly OAuth app.', errors: { client_secret: ['Enter the Client Secret of your Calendly OAuth app.'] } },
      { status: 422 },
    )))

    renderWithProviders(<CalendlySettings />)

    await user.type(await screen.findByLabelText(/^client id/i), 'CLIENT-ID')
    // No secret saved yet: one must be entered before Save is on.
    expect(screen.getByRole('button', { name: /save keys/i })).toBeDisabled()
    await user.type(screen.getByLabelText(/client secret/i), 'SECRET')
    await user.click(screen.getByRole('button', { name: /save keys/i }))

    expect(await screen.findByText('Enter the Client Secret of your Calendly OAuth app.')).toBeInTheDocument()
  })

  it('has only the keys - the Calendly account is connected from Appointments', async () => {
    api('get', SETTINGS, settings({ connected: true, name: 'Host Calendly' }))

    renderWithProviders(<CalendlySettings />)

    expect(await screen.findByLabelText(/^client id/i)).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /connect calendly/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /disconnect/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument()
  })
})
