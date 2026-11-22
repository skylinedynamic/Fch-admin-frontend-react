import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import SettingsForm from '../../../src/pages/settings/components/SettingsForm'
import CalendlyConfigurationForm from '../../../src/pages/settings/components/CalendlyConfigurationForm'
import { SECRET_DISPLAY_MASK } from '../../../src/config/appConfig'
import { CALENDLY_CONFIGURATION_PERMISSION, CALENDLY_CONFIGURATION_SECTION } from '../../../src/config/calendlyConfiguration'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function signInWith(permissions: string[], isHost: number) {
  useAuthStore.setState({
    token: 't',
    user: { id: 1, name: 'Pat', permissions, partner_id: 2, is_host: isHost },
    userSubscription: null,
  } as never)
}

const settings = (data: object) =>
  server.use(http.get('*/common/calendly/settings', () => HttpResponse.json({ status: true, data })))

const unset = {
  configured: false, client_id: null, has_client_secret: false,
  redirect_uri: 'https://api.example.test/api/v1/calendly/callback',
  scopes: ['users:read', 'scheduled_events:write'],
}

afterEach(() => server.resetHandlers())

describe('Settings menu - Calendly Configuration (host only)', () => {
  const renderMenu = () => {
    server.use(http.get('*/common/mail-configurations', () => HttpResponse.json({ status: true, data: { configurations: [], uses_own_configuration: false } })))
    settings(unset)
    return renderWithProviders(<SettingsForm fetching={false} activeSection={CALENDLY_CONFIGURATION_SECTION} setActiveSection={vi.fn()} />)
  }

  it('is listed for the host with the permission', () => {
    signInWith([CALENDLY_CONFIGURATION_PERMISSION], 1)
    renderMenu()

    expect(screen.getByRole('button', { name: 'Calendly Configuration' })).toBeInTheDocument()
  })

  it('is hidden without the permission, and for any other partner', () => {
    signInWith([], 1)
    const { unmount } = renderMenu()
    expect(screen.queryByRole('button', { name: 'Calendly Configuration' })).not.toBeInTheDocument()
    unmount()

    signInWith([CALENDLY_CONFIGURATION_PERMISSION], 0)
    renderMenu()
    expect(screen.queryByRole('button', { name: 'Calendly Configuration' })).not.toBeInTheDocument()
  })
})

describe('CalendlyConfigurationForm', () => {
  it('shows what to enter on the Calendly app', async () => {
    settings(unset)
    renderWithProviders(<CalendlyConfigurationForm />)

    expect(await screen.findByText('https://api.example.test/api/v1/calendly/callback')).toBeInTheDocument()
    expect(screen.getByText('scheduled_events:write')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Calendly' })).toBeInTheDocument()
  })

  it('saves the Client ID and Secret', async () => {
    settings(unset)
    let body: any = null
    server.use(http.put('*/common/calendly/settings', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, message: 'Calendly configuration saved.', data: { ...unset, configured: true, client_id: 'cid', has_client_secret: true } })
    }))
    renderWithProviders(<CalendlyConfigurationForm />)

    await userEvent.type(await screen.findByLabelText(/client id/i), 'cid')
    await userEvent.type(screen.getByLabelText(/client secret/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Save Configuration' }))

    await waitFor(() => expect(body).toEqual({ client_id: 'cid', client_secret: 'secret' }))
  })

  it('shows a saved secret as dots, never its value, and saving the dots keeps it', async () => {
    settings({ ...unset, configured: true, client_id: 'cid', has_client_secret: true })
    let body: any = null
    server.use(http.put('*/common/calendly/settings', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, data: { ...unset, configured: true, client_id: 'cid', has_client_secret: true } })
    }))
    renderWithProviders(<CalendlyConfigurationForm />)

    const secret = await screen.findByLabelText(/client secret/i)
    expect(secret).toHaveValue(SECRET_DISPLAY_MASK)
    expect(screen.getByText(/saved - type a new one to replace it/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save Configuration' }))

    await waitFor(() => expect(body).toEqual({ client_id: 'cid', client_secret: '' }))
  })

  it('clears the dots when the secret field is clicked, and puts them back if nothing is typed', async () => {
    settings({ ...unset, configured: true, client_id: 'cid', has_client_secret: true })
    renderWithProviders(<CalendlyConfigurationForm />)

    const secret = await screen.findByLabelText(/client secret/i)
    await userEvent.click(secret)
    expect(secret).toHaveValue('')
    await userEvent.tab()
    expect(secret).toHaveValue(SECRET_DISPLAY_MASK)
  })

  it('shows a skeleton while the configuration loads', async () => {
    server.use(http.get('*/common/calendly/settings', async () => {
      await new Promise((resolve) => setTimeout(resolve, 200))
      return HttpResponse.json({ status: true, data: unset })
    }))
    const { container } = renderWithProviders(<CalendlyConfigurationForm />)

    expect(container.querySelector('.skeleton-line')).not.toBeNull()
    expect(screen.getByText('Calendly Configuration')).toBeInTheDocument()
    expect(await screen.findByLabelText(/client id/i)).toBeInTheDocument()
  })

  it('shows the API\'s reason under the field', async () => {
    settings(unset)
    server.use(http.put('*/common/calendly/settings', () => HttpResponse.json({
      status: false, message: 'Invalid', errors: { client_secret: ['Enter the Client Secret of the Calendly app.'] },
    }, { status: 422 })))
    renderWithProviders(<CalendlyConfigurationForm />)

    await userEvent.type(await screen.findByLabelText(/client id/i), 'cid')
    await userEvent.click(screen.getByRole('button', { name: 'Save Configuration' }))

    expect(await screen.findByText('Enter the Client Secret of the Calendly app.')).toBeInTheDocument()
  })
})
