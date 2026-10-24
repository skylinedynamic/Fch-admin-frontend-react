import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../../mocks/server'
import { renderWithProviders, screen, within } from '../../../../test-utils'
import { useAuthStore } from '../../../../../src/store/auth'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import PaymentMethodConfig from '../../../../../src/pages/settings/components/PaymentMethodConfig/PaymentMethodConfig'

/**
 * Settings -> Payment Integration, the list of payment methods.
 *
 * A method that is switched on but not set up for its mode (Stripe without
 * usable keys, Bank Transfer without a bank account) is no longer offered to
 * payers. The list only marks its row "Not configured"; what is missing is
 * shown on the method's own page, which the row opens.
 */
const PK_MISSING = 'The Production publishable key is missing or is not a Stripe publishable key (it starts with pk_live_ or pk_test_).'
const NO_BANK = 'No active bank account is set up for Sandbox mode.'

const provider = (overrides: Record<string, unknown>) => ({
  slug: 'x', logo: null, status: true, is_default: false, is_configured: true, payment_mode: 'sandbox', publishable_key: null, setup_issues: [],
  ...overrides,
})

const STRIPE_BROKEN = provider({ id: 1, name: 'Stripe', payment_mode: 'production', setup_issues: [PK_MISSING] })
const BANK_BROKEN = provider({ id: 6, name: 'Bank Transfer', setup_issues: [NO_BANK] })
const CASH = provider({ id: 7, name: 'Cash Payment' })

function mount(providers: unknown[]) {
  useAuthStore.setState({ token: 't', user: { id: 1, is_host: 1, entity_type: 'Partner', partner_id: 1, permissions: [] } } as never)
  server.use(http.get('*/common/partner-payment-providers', () => HttpResponse.json({ status: true, data: providers })))
  renderWithProviders(<PaymentMethodConfig />)
}

const row = (name: string) => screen.getByText(name, { selector: 'h6' }).closest('.payment-method-row') as HTMLElement

beforeEach(() => vi.clearAllMocks())

describe('PaymentMethodConfig - methods that are not set up', () => {
  it('marks only the active methods that are not set up "Not configured"', async () => {
    mount([STRIPE_BROKEN, BANK_BROKEN, CASH])

    await screen.findByText('Cash Payment')
    expect(within(row('Stripe')).getByText('Not configured')).toBeInTheDocument()
    expect(within(row('Bank Transfer')).getByText('Not configured')).toBeInTheDocument()
    expect(within(row('Cash Payment')).queryByText('Not configured')).not.toBeInTheDocument()
  })

  it("shows no alert on the list - what is missing belongs on the method's own page", async () => {
    mount([STRIPE_BROKEN, BANK_BROKEN, CASH])

    await screen.findByText('Cash Payment')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(PK_MISSING)).not.toBeInTheDocument()
  })

  it('marks nothing when every active method is set up', async () => {
    mount([CASH, provider({ id: 1, name: 'Stripe' })])

    await screen.findByText('Cash Payment')
    expect(screen.queryByText('Not configured')).not.toBeInTheDocument()
  })

  it('ignores a method that is switched off, even if it is not set up', async () => {
    mount([{ ...STRIPE_BROKEN, status: false }, CASH])

    await screen.findByText('Cash Payment')
    expect(screen.queryByText('Not configured')).not.toBeInTheDocument()
  })

  it("opens the method's page, which says what is missing", async () => {
    server.use(
      http.get('*/common/partner-payment-providers/1', () =>
        HttpResponse.json({ status: true, data: { id: 3, status: true, is_default: false, payment_mode: 'production', configuration: {}, bank_details: [], setup_issues: [PK_MISSING] } })
      )
    )
    const user = userEvent.setup()
    mount([STRIPE_BROKEN, CASH])

    await user.click(await screen.findByText('Stripe', { selector: 'h6' }))

    expect(await screen.findByText('Stripe Integration')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent(PK_MISSING)
  })

  it('copes with an API that sends no setup_issues', async () => {
    const { setup_issues: _ignored, ...older } = STRIPE_BROKEN
    mount([older, CASH])

    await screen.findByText('Cash Payment')
    expect(screen.queryByText('Not configured')).not.toBeInTheDocument()
  })
})
