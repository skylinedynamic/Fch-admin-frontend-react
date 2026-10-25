import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-toastify'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import SmsConfigurationForm from '../../../src/pages/settings/components/SmsConfiguration/SmsConfigurationForm'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn() }) }
})

/** The custom (PrimeReact) dropdown that owns the given input id. */
const dropdown = (container: HTMLElement, inputId: string) =>
  container.querySelector(`#${inputId}`)!.closest('.p-dropdown') as HTMLElement

const options = {
  countries: [
    { value: 'USA', label: 'United States', providers: [{ value: 'twilio', label: 'Twilio' }] },
    { value: 'CAN', label: 'Canada', providers: [{ value: 'twilio', label: 'Twilio' }] },
  ],
}

const saved = {
  country: 'USA',
  provider: 'twilio',
  is_enabled: true,
  from_number: '+15005550006',
  account_sid: 'AC0123456789abcdef0123456789abcdef',
  auth_token: '••••••••',
  messaging_service_sid: null,
  updated_at: '2026-10-05T10:00:00+00:00',
}

function mockGet(configuration: typeof saved | null) {
  server.use(
    http.get('*/common/sms-configuration', () =>
      HttpResponse.json({ status: true, message: 'ok', data: { configuration, options } })
    )
  )
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => server.resetHandlers())

describe('SmsConfigurationForm', () => {
  it('shows the saved configuration without ever filling in the auth token', async () => {
    mockGet(saved)

    const { container } = renderWithProviders(<SmsConfigurationForm />)

    expect(await screen.findByLabelText(/account sid/i)).toHaveValue(saved.account_sid)
    expect(screen.getByLabelText(/from number/i)).toHaveValue('+15005550006')
    expect(dropdown(container, 'sms-country')).toHaveTextContent('United States')
    expect(dropdown(container, 'sms-provider')).toHaveTextContent('Twilio')
    expect(screen.getByLabelText(/enable sms/i)).toBeChecked()

    const token = screen.getByLabelText(/auth token/i)
    expect(token).toHaveValue('')
    expect(token).toHaveAttribute('placeholder', expect.stringMatching(/saved/i))
  })

  it('tells a white-label partner its users get no texts while it is disabled', async () => {
    useAuthStore.setState({ user: { id: 1, is_host: 0, permissions: [] } } as never)
    mockGet(null)

    renderWithProviders(<SmsConfigurationForm />)

    expect(await screen.findByText(/text messages for your users/i)).toHaveTextContent(/while it is disabled, no text messages are sent/i)
  })

  it('tells the host its account also covers certified partners', async () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1, permissions: [] } } as never)
    mockGet(null)

    renderWithProviders(<SmsConfigurationForm />)

    expect(await screen.findByText(/the platform and all certified partners/i)).toBeInTheDocument()
  })

  it('starts an unconfigured partner on the first country and provider, switched off', async () => {
    mockGet(null)

    const { container } = renderWithProviders(<SmsConfigurationForm />)

    await screen.findByLabelText(/enable sms/i)
    expect(dropdown(container, 'sms-country')).toHaveTextContent('United States')
    expect(dropdown(container, 'sms-provider')).toHaveTextContent('Twilio')
    expect(screen.getByLabelText(/enable sms/i)).not.toBeChecked()
  })

  it('uses the custom dropdown, listing the countries on click', async () => {
    mockGet(saved)
    const user = userEvent.setup()
    const { container } = renderWithProviders(<SmsConfigurationForm />)

    await screen.findByLabelText(/enable sms/i)
    expect(container.querySelectorAll('.p-dropdown')).toHaveLength(2)

    await user.click(dropdown(container, 'sms-country'))

    // The opened panel is portalled to <body>, outside the form.
    await waitFor(() => expect(document.body.querySelector('.p-dropdown-panel')).not.toBeNull())
    const items = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).map((el) => el.textContent)
    expect(items).toEqual(['United States', 'Canada'])
  })

  it('saves the form, leaving a blank token so the stored one is kept', async () => {
    mockGet(saved)
    let received: Record<string, unknown> | null = null
    server.use(
      http.post('*/common/sms-configuration', async ({ request }) => {
        received = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ status: true, message: 'SMS configuration saved successfully.', data: { configuration: saved, options } })
      })
    )
    const user = userEvent.setup()
    renderWithProviders(<SmsConfigurationForm />)

    const from = await screen.findByLabelText(/from number/i)
    await user.clear(from)
    await user.type(from, '+15005550007')
    await user.click(screen.getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(received).not.toBeNull())
    expect(received).toEqual({
      country: 'USA',
      provider: 'twilio',
      is_enabled: true,
      account_sid: saved.account_sid,
      auth_token: '',
      from_number: '+15005550007',
      messaging_service_sid: '',
    })
    expect(toast.success).toHaveBeenCalledWith('SMS configuration saved successfully.')
  })

  it('shows the server validation errors under their fields', async () => {
    mockGet(null)
    server.use(
      http.post('*/common/sms-configuration', () =>
        HttpResponse.json(
          { status: false, message: 'Invalid', errors: { auth_token: 'This field is required.' } },
          { status: 422 }
        )
      )
    )
    const user = userEvent.setup()
    renderWithProviders(<SmsConfigurationForm />)

    await user.click(await screen.findByLabelText(/enable sms/i))
    await user.click(screen.getByRole('button', { name: /save configuration/i }))

    expect(await screen.findByText('This field is required.')).toBeInTheDocument()
  })

  it('sends a test SMS to the number entered', async () => {
    mockGet(saved)
    let received: unknown = null
    server.use(
      http.post('*/common/sms-configuration/test', async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({ status: true, message: 'Test SMS sent.' })
      })
    )
    const user = userEvent.setup()
    renderWithProviders(<SmsConfigurationForm />)

    await user.type(await screen.findByLabelText(/test phone number/i), '+15551234567')
    await user.click(screen.getByRole('button', { name: /send test sms/i }))

    await waitFor(() => expect(received).toEqual({ phone: '+15551234567' }))
    expect(toast.success).toHaveBeenCalledWith('Test SMS sent.')
  })

  it('reports why a test SMS was rejected', async () => {
    mockGet(saved)
    server.use(
      http.post('*/common/sms-configuration/test', () =>
        HttpResponse.json({ status: false, message: 'The test SMS could not be sent: Authenticate' }, { status: 422 })
      )
    )
    const user = userEvent.setup()
    renderWithProviders(<SmsConfigurationForm />)

    await user.type(await screen.findByLabelText(/test phone number/i), '+15551234567')
    await user.click(screen.getByRole('button', { name: /send test sms/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('The test SMS could not be sent: Authenticate'))
  })

  it('cannot send a test before a configuration is saved', async () => {
    mockGet(null)
    renderWithProviders(<SmsConfigurationForm />)

    expect(await screen.findByRole('button', { name: /send test sms/i })).toBeDisabled()
  })
})
