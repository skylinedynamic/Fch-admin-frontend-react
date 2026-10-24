import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import MailConfigurationSection from '../../../src/pages/settings/components/MailConfiguration/MailConfigurationSection'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn() }) }
})

// The real confirmation modal is a Bootstrap modal with timed transitions.
vi.mock('../../../src/components/Common/Modals/DynamicActionModal', () => ({
  default: (props: { show: boolean; title: string; confirmText?: string; cancelText?: string; onConfirm: () => void; onClose: () => void }) =>
    props.show ? (
      <div role="dialog" aria-label={props.title}>
        <button type="button" onClick={props.onConfirm}>{props.confirmText ?? 'Confirm'}</button>
        <button type="button" onClick={props.onClose}>{props.cancelText ?? 'Cancel'}</button>
      </div>
    ) : null,
}))

const providers = [
  {
    value: 'smtp',
    label: 'SMTP',
    fields: [
      { key: 'smtp_host', label: 'SMTP Host', type: 'text', required: true, secret: false, options: [] },
      { key: 'smtp_port', label: 'SMTP Port', type: 'number', required: true, secret: false, options: [] },
      {
        key: 'smtp_encryption', label: 'Encryption', type: 'select', required: true, secret: false,
        options: [{ value: 'tls', label: 'TLS' }, { value: 'ssl', label: 'SSL' }, { value: 'none', label: 'None' }],
      },
      { key: 'smtp_username', label: 'SMTP Username', type: 'text', required: true, secret: false, options: [] },
      { key: 'smtp_password', label: 'SMTP Password', type: 'password', required: true, secret: true, options: [] },
    ],
  },
  {
    value: 'aws_ses',
    label: 'Amazon SES',
    fields: [
      { key: 'aws_access_key', label: 'AWS Access Key', type: 'text', required: true, secret: false, options: [] },
      { key: 'aws_secret_key', label: 'AWS Secret Key', type: 'password', required: true, secret: true, options: [] },
      { key: 'aws_region', label: 'AWS Region', type: 'text', required: true, secret: false, options: [] },
    ],
  },
]

const smtp = (overrides: Record<string, unknown> = {}) => ({
  id: 11,
  provider: 'smtp',
  provider_label: 'SMTP',
  from_address: 'mail@acme.test',
  bcc_emails: null,
  smtp_host: 'smtp.acme.test',
  smtp_port: 587,
  smtp_encryption: 'tls',
  smtp_username: 'mailer',
  smtp_password: '••••••••',
  is_default: false,
  is_verified: false,
  verified_at: null,
  verified_to: null,
  updated_at: '2026-10-17T10:00:00+00:00',
  ...overrides,
})

const ses = (overrides: Record<string, unknown> = {}) => ({
  id: 12,
  provider: 'aws_ses',
  provider_label: 'Amazon SES',
  from_address: 'ses@acme.test',
  bcc_emails: null,
  aws_access_key: 'AKIAACME',
  aws_secret_key: '••••••••',
  aws_region: 'us-east-1',
  is_default: false,
  is_verified: true,
  verified_at: '2026-10-17T09:00:00+00:00',
  verified_to: 'pat@acme.test',
  updated_at: '2026-10-17T09:00:00+00:00',
  ...overrides,
})

type ListState = {
  configurations: Record<string, unknown>[]
  uses_own_configuration: boolean
  fallback: { is_configured: boolean; is_verified: boolean }
  can_manage_fallback: boolean
}

let list: ListState

function mockList() {
  server.use(
    http.get('*/common/mail-configurations', () =>
      HttpResponse.json({ status: true, message: 'ok', data: { ...list, providers } })
    )
  )
}

const card = (name: string) => screen.findByRole('region', { name })

/** Opens the provider dropdown in the card and picks the option. */
async function pickProvider(user: ReturnType<typeof userEvent.setup>, region: HTMLElement, inputId: string, option: string) {
  await user.click(region.querySelector(`#${inputId}`)!.closest('.p-dropdown') as HTMLElement)
  const item = await waitFor(() => {
    const found = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item'))
      .find((el) => el.textContent?.includes(option))
    if (!found) throw new Error(`no "${option}" option`)
    return found as HTMLElement
  })
  await user.click(item)
}

/** Picks a provider and confirms the switch, as the modal asks. */
async function chooseProvider(user: ReturnType<typeof userEvent.setup>, region: HTMLElement, inputId: string, option: string) {
  await pickProvider(user, region, inputId, option)
  const dialog = await screen.findByRole('dialog', { name: 'Confirm Provider Change' })
  await user.click(within(dialog).getByRole('button', { name: `Yes, Change to ${option}` }))
}

beforeEach(() => {
  vi.clearAllMocks()
  list = {
    configurations: [smtp()],
    uses_own_configuration: false,
    fallback: { is_configured: true, is_verified: true },
    can_manage_fallback: false,
  }
  mockList()
})

afterEach(() => server.resetHandlers())

describe('MailConfigurationSection', () => {
  it('warns, in danger and before anything else, that mail goes through the fallback until verified', async () => {
    renderWithProviders(<MailConfigurationSection />)

    const note = await screen.findByText(
      'Until the mail configuration is verified, all mail will be sent using the fallback mail configuration.'
    )
    const alert = note.closest('[role="alert"]') as HTMLElement
    expect(alert).toHaveClass('alert-danger')
    expect(within(alert).getByRole('heading', { name: 'Your mail settings are not verified' })).toBeInTheDocument()
    // First in the card, ahead of the banner and the form.
    const form = await card('Email configuration')
    expect(form.querySelector('[role="alert"]')).toBe(alert)
    expect(within(alert).getByRole('button', { name: 'Verify now' })).toBeInTheDocument()

    expect(within(form).getByText('Not verified')).toBeInTheDocument()
    expect(within(form).getByText(/Currently configuring/)).toHaveTextContent('SMTP')
    expect(within(form).getByLabelText(/SMTP Host/)).toHaveValue('smtp.acme.test')
    // A stored password shows as a mask, never in clear.
    expect(within(form).getByLabelText(/SMTP Password/)).toHaveValue('••••••••')
  })

  it('takes "Verify now" to the verification step', async () => {
    const scrolled: Element[] = []
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (this: Element) { scrolled.push(this) }
    try {
      const user = userEvent.setup()
      renderWithProviders(<MailConfigurationSection />)
      const form = await card('Email configuration')

      await user.click(within(form).getByRole('button', { name: 'Verify now' }))

      expect(scrolled).toEqual([within(form).getByRole('region', { name: 'Verify this configuration' })])
      expect(within(form).getByRole('button', { name: 'Send verification code' })).toHaveFocus()
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('clears the masked password to type a new one, and puts the mask back if left empty', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')
    const password = within(form).getByLabelText(/SMTP Password/)

    await user.click(password)
    expect(password).toHaveValue('')

    await user.click(within(form).getByLabelText(/SMTP Host/))
    expect(password).toHaveValue('••••••••')

    await user.click(password)
    await user.type(password, 'new-secret')
    expect(password).toHaveValue('new-secret')
  })

  it('warns that changing verified settings means verifying them again', async () => {
    list.configurations = [smtp({ is_verified: true, is_default: true })]
    list.uses_own_configuration = true
    mockList()
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')

    expect(within(form).queryByText(/must be verified again/i)).not.toBeInTheDocument()

    await user.type(within(form).getByLabelText(/SMTP Host/), 'x')

    expect(within(form).getByText(/must be verified again/i)).toBeInTheDocument()
    expect(within(form).getByText(/fallback/i, { selector: '.reverify-warning *' })).toBeInTheDocument()
  })

  it('opens on the provider mail is sent with', async () => {
    list.configurations = [smtp({ is_verified: true }), ses({ is_default: true })]
    list.uses_own_configuration = true
    mockList()

    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')

    expect(within(form).getByText(/Currently configuring/)).toHaveTextContent('Amazon SES')
    expect(within(form).getByText('Default')).toBeInTheDocument()
    expect(within(form).getByLabelText(/AWS Access Key/)).toHaveValue('AKIAACME')
  })

  it('shows which verified configuration mail is sent with, and since when', async () => {
    list.configurations = [smtp({ is_verified: true }), ses({ is_default: true })]
    list.uses_own_configuration = true
    mockList()
    const user = userEvent.setup()

    renderWithProviders(<MailConfigurationSection />)
    const status = await screen.findByRole('status', { name: 'Mail delivery status' })

    expect(within(status).getByText('Active')).toBeInTheDocument()
    expect(within(status).getByRole('heading', { name: 'Sending with Amazon SES' })).toBeInTheDocument()
    expect(status).toHaveTextContent('From ses@acme.test')
    expect(status).toHaveTextContent(/Verified Oct 1[67], 2026 · code sent to pat@acme\.test/)
    // No danger once mail goes out under the partner's own settings.
    expect(screen.queryByText(/Until the mail configuration is verified/)).not.toBeInTheDocument()

    // Looking at another provider does not change what mail is sent with.
    const form = await card('Email configuration')
    await chooseProvider(user, form, 'mail-provider', 'SMTP')
    expect(within(status).getByRole('heading', { name: 'Sending with Amazon SES' })).toBeInTheDocument()
  })

  it('verifies a provider with the code sent through it', async () => {
    const calls: string[] = []
    server.use(
      http.post('*/common/mail-configurations/11/send-code', () => {
        calls.push('send')
        return HttpResponse.json({ status: true, message: 'A verification code has been sent to pat@acme.test.', data: null })
      }),
      http.post('*/common/mail-configurations/11/verify', async ({ request }) => {
        calls.push(`verify ${(await request.json() as { code: string }).code}`)
        list = { ...list, configurations: [smtp({ is_verified: true, is_default: true, verified_to: 'pat@acme.test' })], uses_own_configuration: true }
        mockList()
        return HttpResponse.json({ status: true, message: 'Mail configuration verified.', data: smtp({ is_verified: true, is_default: true }) })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')

    await user.click(within(form).getByRole('button', { name: 'Send verification code' }))
    expect(await within(form).findByText(/sent to pat@acme\.test/)).toBeInTheDocument()
    // A new code waits out the minute the API asks for.
    expect(within(form).getByRole('button', { name: /Resend code in \d+s/ })).toBeDisabled()

    await user.type(within(form).getByLabelText('Verification code'), '482913')
    await user.click(within(form).getByRole('button', { name: 'Verify' }))

    await waitFor(() => expect(within(form).getByText('Verified')).toBeInTheDocument())
    expect(within(form).getByText('Default')).toBeInTheDocument()
    expect(calls).toEqual(['send', 'verify 482913'])
    expect(await screen.findByRole('heading', { name: 'Sending with SMTP' })).toBeInTheDocument()
  })

  it('lays the code out in six boxes, filled as it is typed, and offers to send it to the signed-in user', async () => {
    useAuthStore.setState({ user: { id: 1, email: 'pat@acme.test', permissions: [] } } as never)
    server.use(
      http.post('*/common/mail-configurations/11/send-code', () => HttpResponse.json({ status: true, message: 'A verification code has been sent to pat@acme.test.', data: null })),
    )
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')
    const panel = within(form).getByRole('region', { name: 'Verify this configuration' })

    expect(panel).toHaveTextContent(/6-digit code to pat@acme\.test/)

    await user.click(within(panel).getByRole('button', { name: 'Send verification code' }))
    await user.type(await within(panel).findByLabelText('Verification code'), '4829')

    const boxes = panel.querySelectorAll('.mail-otp-box')
    expect(boxes).toHaveLength(6)
    expect(Array.from(boxes).map((b) => b.textContent)).toEqual(['4', '8', '2', '9', '', ''])
    expect(boxes[4]).toHaveClass('is-active')
    expect(within(panel).getByRole('button', { name: 'Verify' })).toBeDisabled()
  })

  it('shows why a code was refused', async () => {
    server.use(
      http.post('*/common/mail-configurations/11/send-code', () => HttpResponse.json({ status: true, message: 'Sent', data: null })),
      http.post('*/common/mail-configurations/11/verify', () =>
        HttpResponse.json({ message: 'The code is incorrect or has expired. Please request a new one.', errors: { code: ['The code is incorrect or has expired. Please request a new one.'] } }, { status: 422 })
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')

    await user.click(within(form).getByRole('button', { name: 'Send verification code' }))
    await user.type(await within(form).findByLabelText('Verification code'), '000000')
    await user.click(within(form).getByRole('button', { name: 'Verify' }))

    expect(await within(form).findByText(/incorrect or has expired/)).toBeInTheDocument()
    expect(within(form).getByText('Not verified')).toBeInTheDocument()
  })

  it('says plainly when the code could not be sent', async () => {
    server.use(
      http.post('*/common/mail-configurations/11/send-code', () =>
        HttpResponse.json({ status: false, message: 'The verification code could not be sent with these settings. Please check them and try again.' }, { status: 422 })
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')

    await user.click(within(form).getByRole('button', { name: 'Send verification code' }))

    expect(await within(form).findByText(/could not be sent with these settings/)).toBeInTheDocument()
    expect(within(form).queryByLabelText('Verification code')).not.toBeInTheDocument()
  })

  it('saves a provider, keeping the stored password when left as it is', async () => {
    let received: Record<string, unknown> | null = null
    server.use(
      http.post('*/common/mail-configurations', async ({ request }) => {
        received = await request.json() as Record<string, unknown>
        return HttpResponse.json({ status: true, message: 'Mail configuration saved. Verify it to start sending with it.', data: smtp({ smtp_host: 'smtp2.acme.test' }) })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')

    const host = within(form).getByLabelText(/SMTP Host/)
    await user.clear(host)
    await user.type(host, 'smtp2.acme.test')
    await user.click(within(form).getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(received).not.toBeNull())
    // The untouched mask goes back, which keeps the stored password.
    expect(received).toMatchObject({ provider: 'smtp', smtp_host: 'smtp2.acme.test', smtp_password: '••••••••', from_address: 'mail@acme.test', smtp_port: 587, smtp_encryption: 'tls' })
  })

  it('takes only digits for the port', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')

    const port = within(form).getByLabelText(/SMTP Port/)
    await user.clear(port)
    await user.type(port, '25a2b5')

    expect(port).toHaveValue('2525')
  })

  it('shows the API field errors next to the fields', async () => {
    server.use(
      http.post('*/common/mail-configurations', () =>
        HttpResponse.json({ status: false, message: 'Invalid', errors: { smtp_host: 'The SMTP Host field is required.' } }, { status: 422 })
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')

    await user.clear(within(form).getByLabelText(/SMTP Host/))
    await user.click(within(form).getByRole('button', { name: /save configuration/i }))

    expect(await within(form).findByText('The SMTP Host field is required.')).toBeInTheDocument()
  })

  it('asks before changing provider, and stays put when cancelled', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')

    await pickProvider(user, form, 'mail-provider', 'Amazon SES')

    const dialog = await screen.findByRole('dialog', { name: 'Confirm Provider Change' })
    // Nothing changes until it is confirmed.
    expect(within(form).getByText(/Currently configuring/)).toHaveTextContent('SMTP')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(form).getByText(/Currently configuring/)).toHaveTextContent('SMTP')
    expect(within(form).getByLabelText(/SMTP Host/)).toHaveValue('smtp.acme.test')
  })

  it('changes provider from the dropdown, starting a new one blank', async () => {
    let received: Record<string, unknown> | null = null
    server.use(
      http.post('*/common/mail-configurations', async ({ request }) => {
        received = await request.json() as Record<string, unknown>
        return HttpResponse.json({ status: true, message: 'Saved', data: null })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')

    await chooseProvider(user, form, 'mail-provider', 'Amazon SES')

    expect(within(form).getByText(/Currently configuring/)).toHaveTextContent('Amazon SES')
    expect(within(form).getByText('Not saved')).toBeInTheDocument()
    expect(within(form).queryByLabelText(/SMTP Host/)).not.toBeInTheDocument()
    expect(within(form).queryByRole('button', { name: 'Send verification code' })).not.toBeInTheDocument()

    await user.type(within(form).getByLabelText(/AWS Access Key/), 'AKIANEW')
    await user.type(within(form).getByLabelText(/AWS Secret Key/), 'ses-secret')
    await user.type(within(form).getByLabelText(/AWS Region/), 'us-east-1')
    await user.click(within(form).getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(received).toMatchObject({
      provider: 'aws_ses', from_address: 'mail@acme.test', aws_access_key: 'AKIANEW', aws_secret_key: 'ses-secret', aws_region: 'us-east-1',
    }))
  })

  it('switches sending to another verified provider after confirming', async () => {
    list.configurations = [smtp({ is_verified: true, is_default: true }), ses()]
    list.uses_own_configuration = true
    mockList()
    let madeDefault: string | null = null
    server.use(
      http.post('*/common/mail-configurations/:id/default', ({ params }) => {
        madeDefault = String(params.id)
        return HttpResponse.json({ status: true, message: 'Default mail configuration updated.', data: null })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')

    // The provider already sending needs no switch.
    expect(within(form).queryByRole('button', { name: 'Use this provider' })).not.toBeInTheDocument()

    await chooseProvider(user, form, 'mail-provider', 'Amazon SES')
    await user.click(within(form).getByRole('button', { name: 'Use this provider' }))
    expect(madeDefault).toBeNull()
    const dialog = await screen.findByRole('dialog', { name: 'Send Mail With This Provider' })
    await user.click(within(dialog).getByRole('button', { name: 'Yes, Send with Amazon SES' }))

    await waitFor(() => expect(madeDefault).toBe('12'))
  })

  it('does not offer an unverified provider for sending', async () => {
    list.configurations = [smtp({ is_verified: true, is_default: true }), ses({ is_verified: false })]
    mockList()
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const form = await card('Email configuration')

    await chooseProvider(user, form, 'mail-provider', 'Amazon SES')

    expect(within(form).getByText('Not verified')).toBeInTheDocument()
    expect(within(form).queryByRole('button', { name: 'Use this provider' })).not.toBeInTheDocument()
  })

  it('warns when there is no verified fallback to send through', async () => {
    list.fallback = { is_configured: false, is_verified: false }
    mockList()

    renderWithProviders(<MailConfigurationSection />)

    expect(await screen.findByText(/no verified fallback mail configuration/i)).toBeInTheDocument()
  })

  it('keeps the fallback from anyone but the host partner', async () => {
    renderWithProviders(<MailConfigurationSection />)
    await card('Email configuration')

    expect(screen.queryByRole('region', { name: 'Fallback email configuration' })).not.toBeInTheDocument()
  })
})

describe('MailConfigurationSection - fallback', () => {
  const fallback = smtp({ id: 1, from_address: 'noreply@fch.test', smtp_host: 'smtp.fch.test', is_verified: false })

  /** The fallback's providers, and which one mail goes out with now. */
  const serveFallback = (configurations: unknown[], sendingId: number | null = null) =>
    server.use(
      http.get('*/common/mail-configurations/fallback', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { configurations, providers, sending_id: sendingId } })
      )
    )

  beforeEach(() => {
    list.can_manage_fallback = true
    mockList()
    serveFallback([fallback])
  })

  it('lets the host partner edit and verify a fallback provider', async () => {
    const calls: string[] = []
    server.use(
      http.post('*/common/mail-configurations/fallback', async ({ request }) => {
        calls.push(`save ${(await request.json() as { smtp_host: string }).smtp_host}`)
        return HttpResponse.json({ status: true, message: 'Saved', data: fallback })
      }),
      http.post('*/common/mail-configurations/fallback/:id/send-code', ({ params }) => {
        calls.push(`send ${params.id}`)
        return HttpResponse.json({ status: true, message: 'A verification code has been sent to host@fch.test.', data: null })
      }),
      http.post('*/common/mail-configurations/fallback/:id/verify', async ({ params, request }) => {
        calls.push(`verify ${params.id} ${(await request.json() as { code: string }).code}`)
        serveFallback([{ ...fallback, is_verified: true, is_default: true }], 1)
        return HttpResponse.json({ status: true, message: 'Verified', data: { ...fallback, is_verified: true, is_default: true } })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)

    const fallbackCard = await card('Fallback email configuration')
    expect(await within(fallbackCard).findByDisplayValue('smtp.fch.test')).toBeInTheDocument()
    expect(within(fallbackCard).getByText(/used for every partner/i)).toBeInTheDocument()

    await user.click(within(fallbackCard).getByRole('button', { name: /save configuration/i }))
    await user.click(within(fallbackCard).getByRole('button', { name: 'Send verification code' }))
    await user.type(await within(fallbackCard).findByLabelText('Verification code'), '135790')
    await user.click(within(fallbackCard).getByRole('button', { name: 'Verify' }))

    await waitFor(() => expect(within(fallbackCard).getByText('Verified')).toBeInTheDocument())
    expect(calls).toEqual(['save smtp.fch.test', 'send 1', 'verify 1 135790'])
  })

  it('warns the host partner, first thing, while no fallback provider can send', async () => {
    const scrolled: Element[] = []
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (this: Element) { scrolled.push(this) }
    try {
      const user = userEvent.setup()
      renderWithProviders(<MailConfigurationSection />)
      const fallbackCard = await card('Fallback email configuration')

      const alert = await within(fallbackCard).findByRole('alert')
      // The same danger notice as the partner's own, at the top of the card.
      expect(alert).toHaveClass('alert-danger', 'mail-unverified-alert')
      expect(fallbackCard.querySelector('[role="alert"]')).toBe(alert)
      expect(within(alert).getByRole('heading', { name: 'Fallback mail is not verified' })).toBeInTheDocument()
      expect(alert).toHaveTextContent(/partners without their own verified mail configuration get no mail/i)

      await user.click(within(alert).getByRole('button', { name: 'Verify now' }))
      expect(scrolled).toEqual([within(fallbackCard).getByRole('region', { name: 'Verify this configuration' })])
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('asks the host partner to set the fallback up when there is none', async () => {
    serveFallback([])
    renderWithProviders(<MailConfigurationSection />)
    const fallbackCard = await card('Fallback email configuration')

    const alert = await within(fallbackCard).findByRole('alert')
    expect(within(alert).getByRole('heading', { name: 'No fallback mail configuration' })).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'Set up now' })).toBeInTheDocument()
  })

  it('shows the fallback provider mail goes out with as active, in the same style as the partner status', async () => {
    serveFallback([{ ...fallback, is_verified: true, is_default: true, verified_at: '2026-10-17 08:44:42', verified_to: 'host@fch.test' }], 1)
    renderWithProviders(<MailConfigurationSection />)
    const fallbackCard = await card('Fallback email configuration')

    const status = await within(fallbackCard).findByRole('status', { name: 'Fallback delivery status' })
    expect(status).toHaveClass('mail-delivery-status')
    expect(within(status).getByRole('heading', { name: 'Fallback sending with SMTP' })).toBeInTheDocument()
    expect(within(status).getByText('Active')).toBeInTheDocument()
    expect(status).toHaveTextContent('From noreply@fch.test')
    expect(status).toHaveTextContent(/Verified Oct 17, 2026 · code sent to host@fch\.test/)
    expect(within(fallbackCard).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('names the provider actually sending when the default cannot', async () => {
    // SMTP is the default but unverified; the verified SES sends meanwhile.
    serveFallback([
      { ...fallback, is_default: true },
      ses({ id: 2, from_address: 'noreply@fch.test', is_verified: true, verified_at: '2026-10-17 08:44:42', verified_to: 'host@fch.test' }),
    ], 2)
    renderWithProviders(<MailConfigurationSection />)
    const fallbackCard = await card('Fallback email configuration')

    const status = await within(fallbackCard).findByRole('status', { name: 'Fallback delivery status' })
    expect(within(status).getByRole('heading', { name: 'Fallback sending with Amazon SES' })).toBeInTheDocument()
  })

  it('keeps the SMTP fallback when the host partner saves SES, and still sends with SMTP', async () => {
    const verifiedSmtp = { ...fallback, is_verified: true, is_default: true, verified_at: '2026-10-17 08:44:42', verified_to: 'host@fch.test' }
    serveFallback([verifiedSmtp], 1)
    let received: Record<string, unknown> | null = null
    server.use(
      http.post('*/common/mail-configurations/fallback', async ({ request }) => {
        received = await request.json() as Record<string, unknown>
        const saved = ses({ id: 2, from_address: 'noreply@fch.test', is_verified: false })
        serveFallback([verifiedSmtp, saved], 1)
        return HttpResponse.json({ status: true, message: 'Saved', data: saved })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const fallbackCard = await card('Fallback email configuration')
    await within(fallbackCard).findByDisplayValue('smtp.fch.test')

    await chooseProvider(user, fallbackCard, 'mail-fallback-provider', 'Amazon SES')
    // Nothing is replaced, so there is nothing to warn about.
    expect(within(fallbackCard).queryByText(/saving switches it/i)).not.toBeInTheDocument()

    await user.type(within(fallbackCard).getByLabelText(/AWS Access Key/), 'AKIAFCH')
    await user.type(within(fallbackCard).getByLabelText(/AWS Secret Key/), 'secret')
    await user.type(within(fallbackCard).getByLabelText(/AWS Region/), 'us-east-1')
    await user.click(within(fallbackCard).getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(received).toMatchObject({ provider: 'aws_ses', aws_access_key: 'AKIAFCH', from_address: 'noreply@fch.test' }))
    await waitFor(() => expect(within(fallbackCard).getByText('Not verified')).toBeInTheDocument())
    expect(within(fallbackCard).getByRole('heading', { name: 'Fallback sending with SMTP' })).toBeInTheDocument()

    // SMTP is still there, settings and all.
    await chooseProvider(user, fallbackCard, 'mail-fallback-provider', 'SMTP')
    expect(within(fallbackCard).getByDisplayValue('smtp.fch.test')).toBeInTheDocument()
    expect(within(fallbackCard).getByText('Default')).toBeInTheDocument()
  })

  it('switches the fallback to another verified provider after confirming', async () => {
    serveFallback([
      { ...fallback, is_verified: true, is_default: true },
      ses({ id: 2, from_address: 'noreply@fch.test', is_verified: true }),
    ], 1)
    let madeDefault: string | null = null
    server.use(
      http.post('*/common/mail-configurations/fallback/:id/default', ({ params }) => {
        madeDefault = String(params.id)
        return HttpResponse.json({ status: true, message: 'Default mail configuration updated.', data: null })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<MailConfigurationSection />)
    const fallbackCard = await card('Fallback email configuration')
    await within(fallbackCard).findByDisplayValue('smtp.fch.test')

    await chooseProvider(user, fallbackCard, 'mail-fallback-provider', 'Amazon SES')
    await user.click(within(fallbackCard).getByRole('button', { name: 'Use this provider' }))
    const dialog = await screen.findByRole('dialog', { name: 'Send Mail With This Provider' })
    await user.click(within(dialog).getByRole('button', { name: 'Yes, Send with Amazon SES' }))

    await waitFor(() => expect(madeDefault).toBe('2'))
  })
})
