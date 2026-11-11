import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../../mocks/server'
import { renderWithProviders, screen, waitFor, within } from '../../../../test-utils'
import { useAuthStore } from '../../../../../src/store/auth'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import PaymentMethodConfigForm from '../../../../../src/pages/settings/components/PaymentMethodConfig/PaymentMethodConfigForm'

/**
 * BUG-207: switching Cash Payment from Production to Sandbox showed the
 * Production warning ("live keys", "real transactions"), and "Yes, Change to
 * Sandbox" only changed the dropdown - nothing was saved until Save
 * Configuration was pressed again.
 */
const CASH = { id: 5, name: 'Cash Payment', slug: 'cash-payment', logo: null, status: true, is_default: false, is_configured: true }
const STRIPE = { id: 1, name: 'Stripe', slug: 'stripe', logo: null, status: true, is_default: false, is_configured: true }

const linkage = (overrides: Record<string, unknown> = {}) => ({
  id: 9, status: true, is_default: false, payment_mode: 'production',
  configuration: {}, bank_details: [], setup_issues: [], can_take_payments: true,
  ...overrides,
})

function mount(provider: typeof CASH, data: Record<string, unknown>) {
  useAuthStore.setState({ token: 't', user: { id: 1, is_host: 1, entity_type: 'Partner', partner_id: 1, permissions: [] } } as never)
  server.use(http.get(`*/common/partner-payment-providers/${provider.id}`, () => HttpResponse.json({ status: true, data })))
  const saved: Record<string, unknown>[] = []
  server.use(http.post('*/common/partner-payment-providers', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    saved.push(body)
    return HttpResponse.json({ status: true, data: linkage({ payment_mode: body.payment_mode }) })
  }))
  renderWithProviders(<PaymentMethodConfigForm provider={provider} onBack={() => {}} />)
  return saved
}

const pickEnvironment = async (user: ReturnType<typeof userEvent.setup>, label: RegExp) => {
  const current = await screen.findByText(/Production|Sandbox/, { selector: '.p-dropdown-label' })
  await user.click(current)
  const option = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item'))
    .find((item) => label.test(item.textContent ?? '')) as HTMLElement
  await user.click(option)
}

const confirmWindow = async () => within((await screen.findByText('Confirm Environment Change')).closest('.modal') as HTMLElement)

beforeEach(() => vi.clearAllMocks())

describe('PaymentMethodConfigForm - changing the environment', () => {
  it('describes a switch to Sandbox as test mode, not as live keys and real transactions', async () => {
    const user = userEvent.setup()
    mount(CASH, linkage())

    await pickEnvironment(user, /Sandbox/)

    const modal = await confirmWindow()
    expect(modal.getByText(/switch the payment environment to/)).toHaveTextContent('Sandbox')
    expect(modal.queryByText(/live/i)).not.toBeInTheDocument()
    expect(modal.queryByText(/Real transactions will be processed/)).not.toBeInTheDocument()
    expect(modal.getByText(/test/i)).toBeInTheDocument()
  })

  it('still warns about real transactions on a switch to Production', async () => {
    const user = userEvent.setup()
    mount(CASH, linkage({ payment_mode: 'sandbox' }))

    await pickEnvironment(user, /Production/)

    const modal = await confirmWindow()
    expect(modal.getByText(/Real transactions will be processed/)).toBeInTheDocument()
  })

  it('saves the new environment as soon as the change is confirmed', async () => {
    const user = userEvent.setup()
    const saved = mount(CASH, linkage())

    await pickEnvironment(user, /Sandbox/)
    await user.click((await confirmWindow()).getByRole('button', { name: 'Yes, Change to Sandbox' }))

    await waitFor(() => expect(saved).toHaveLength(1))
    expect(saved[0]).toMatchObject({ payment_provider_id: 5, payment_mode: 'sandbox' })
  })

  it('saves nothing when the change is cancelled', async () => {
    const user = userEvent.setup()
    const saved = mount(CASH, linkage())

    await pickEnvironment(user, /Sandbox/)
    const modal = await confirmWindow()
    await user.click(modal.getByRole('button', { name: /cancel/i }))

    expect(saved).toHaveLength(0)
  })

  /** A gateway with keys switched to a mode it has none for: nothing to save yet, the fields say what is missing. */
  it('asks for the missing keys instead of saving a mode that has none', async () => {
    const user = userEvent.setup()
    const saved = mount(STRIPE, linkage({ configuration: { production: { publishable_key: 'pk_live_abc', secret_key: 'sk_live_abc' } } }))

    await pickEnvironment(user, /Sandbox/)
    await user.click((await confirmWindow()).getByRole('button', { name: 'Yes, Change to Sandbox' }))

    expect(await screen.findByText('Stripe Publishable Key is required.')).toBeInTheDocument()
    expect(saved).toHaveLength(0)
  })
})
