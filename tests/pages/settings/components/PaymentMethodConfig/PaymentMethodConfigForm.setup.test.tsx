import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../../mocks/server'
import { renderWithProviders, screen, waitFor } from '../../../../test-utils'
import { useAuthStore } from '../../../../../src/store/auth'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import PaymentMethodConfigForm from '../../../../../src/pages/settings/components/PaymentMethodConfig/PaymentMethodConfigForm'

/**
 * Settings -> Payment Integration -> a method's own page. When the method is
 * switched on but not set up for its mode, the page says what is missing - the
 * same messages as the list - and follows the API's answer after each save.
 */
const STRIPE = { id: 1, name: 'Stripe', slug: 'stripe', logo: null, status: true, is_default: false, is_configured: true }
const PK_MISSING = 'The Sandbox publishable key is missing or is not a Stripe publishable key (it starts with pk_live_ or pk_test_).'
const SK_MISSING = 'The Sandbox secret key is missing or is not a Stripe secret key (it starts with sk_live_, sk_test_, rk_live_ or rk_test_).'

const linkage = (overrides: Record<string, unknown> = {}) => ({
  id: 3, status: true, is_default: false, payment_mode: 'sandbox',
  configuration: { sandbox: { publishable_key: '', secret_key: '' } }, bank_details: [], setup_issues: [PK_MISSING, SK_MISSING],
  can_take_payments: false,
  ...overrides,
})

function mount(data: Record<string, unknown>) {
  useAuthStore.setState({ token: 't', user: { id: 1, is_host: 1, entity_type: 'Partner', partner_id: 1, permissions: [] } } as never)
  server.use(http.get('*/common/partner-payment-providers/1', () => HttpResponse.json({ status: true, data })))
  renderWithProviders(<PaymentMethodConfigForm provider={STRIPE} onBack={() => {}} />)
}

const fillKeys = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(await screen.findByPlaceholderText('pk_test_...'), 'pk_test_abc')
  await user.type(screen.getByPlaceholderText('sk_test_...'), 'sk_test_abc')
}

beforeEach(() => vi.clearAllMocks())

describe('PaymentMethodConfigForm - what the method still needs', () => {
  it('says what is missing when the method is switched on but not set up', async () => {
    mount(linkage())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/Stripe can.t take payments yet/)
    expect(alert).toHaveTextContent(/aren.t offered Stripe until it.s set up/)
    expect(alert).toHaveTextContent(PK_MISSING)
    expect(alert).toHaveTextContent(SK_MISSING)
  })

  it('says nothing when the method is set up', async () => {
    mount(linkage({ setup_issues: [], configuration: { sandbox: { publishable_key: 'pk_test_abc', secret_key: 'sk_test_abc' } } }))

    await screen.findByDisplayValue('pk_test_abc')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says nothing while the method is switched off', async () => {
    mount(linkage({ status: false }))

    await screen.findByText('Stripe Integration')
    await screen.findByText('Inactive')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('goes away once a save leaves nothing missing', async () => {
    server.use(http.post('*/common/partner-payment-providers', () => HttpResponse.json({ status: true, data: linkage({ setup_issues: [] }) })))
    const user = userEvent.setup()
    mount(linkage())
    await screen.findByRole('alert')

    await fillKeys(user)
    await user.click(screen.getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('shows what is still missing after a save', async () => {
    server.use(http.post('*/common/partner-payment-providers', () => HttpResponse.json({ status: true, data: linkage({ setup_issues: [SK_MISSING] }) })))
    const user = userEvent.setup()
    mount(linkage())
    await screen.findByRole('alert')

    await fillKeys(user)
    await user.click(screen.getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(screen.getByRole('alert')).not.toHaveTextContent(PK_MISSING))
    expect(screen.getByRole('alert')).toHaveTextContent(SK_MISSING)
  })

  it("says what a gateway paid by reference number is missing, without saying payers can't use it", async () => {
    // Square, Authorize.Net, Ecrypt... are paid outside the app, so they stay offered meanwhile.
    const SQUARE = { ...STRIPE, id: 4, name: 'Square', slug: 'square' }
    const NO_APP_ID = 'The Sandbox Application ID is missing.'
    const NO_TOKEN = 'The Sandbox Access Token is missing.'
    useAuthStore.setState({ token: 't', user: { id: 1, is_host: 1, entity_type: 'Partner', partner_id: 1, permissions: [] } } as never)
    server.use(
      http.get('*/common/partner-payment-providers/4', () =>
        HttpResponse.json({ status: true, data: linkage({ configuration: null, setup_issues: [NO_APP_ID, NO_TOKEN], can_take_payments: true }) })
      )
    )
    renderWithProviders(<PaymentMethodConfigForm provider={SQUARE} onBack={() => {}} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/Square isn.t fully set up/)
    expect(alert).toHaveTextContent(NO_APP_ID)
    expect(alert).toHaveTextContent(NO_TOKEN)
    expect(alert).not.toHaveTextContent(/aren.t offered|can.t take payments/)
  })

  it("treats an API that doesn't say whether payers can use it as one they can't", async () => {
    const { can_take_payments: _ignored, ...older } = linkage()
    mount(older)

    expect(await screen.findByRole('alert')).toHaveTextContent(/Stripe can.t take payments yet/)
  })
})
