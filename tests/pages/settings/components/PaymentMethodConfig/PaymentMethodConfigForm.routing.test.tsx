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
 * Settings -> Payment Method -> Bank Transfer: the routing number is written as
 * digits only, nine at most. Whether it is a routing number is the API's call
 * (App\Rules\RoutingNumber); its error lands under the field.
 */
const BANK = { id: 6, name: 'Bank Transfer', slug: 'bank-transfer', logo: null, status: true, is_default: false, is_configured: true }

const ROW = {
  id: 1, bank_name: 'First Bank', account_name: 'Acme LLC', account_number: '000123456789', routing_number: '',
  instructions: '', payment_mode: 'sandbox', is_default: true, status: true,
}

const ROUTING_INVALID = 'Enter a 9-digit routing number, e.g. 021000021.'

function mount() {
  useAuthStore.setState({ token: 't', user: { id: 1, is_host: 1, entity_type: 'Partner', partner_id: 1, permissions: [] } } as never)
  server.use(
    http.get('*/common/partner-payment-providers/6', () =>
      HttpResponse.json({ status: true, data: { id: 3, status: true, is_default: false, payment_mode: 'sandbox', configuration: {}, bank_details: [ROW] } })
    )
  )
  renderWithProviders(<PaymentMethodConfigForm provider={BANK} onBack={() => {}} />)
  return screen.findByPlaceholderText('Routing Number') as Promise<HTMLInputElement>
}

beforeEach(() => vi.clearAllMocks())

describe('PaymentMethodConfigForm - routing number', () => {
  it('keeps the routing number to digits, nine at most', async () => {
    const user = userEvent.setup()
    const routing = await mount()

    await user.type(routing, '02a1-000 0219999')

    expect(routing).toHaveValue('021000021')
  })

  it('shows the API\'s routing number error under the field', async () => {
    const user = userEvent.setup()
    const routing = await mount()
    let sent: any = null
    server.use(
      http.post('*/common/partner-payment-providers', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(
          { status: false, message: ROUTING_INVALID, errors: { 'bank_details.0.routing_number': ROUTING_INVALID } },
          { status: 422 }
        )
      })
    )

    await user.type(routing, '12345')
    await user.click(screen.getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(sent?.bank_details?.[0]?.routing_number).toBe('12345'))
    expect(await screen.findByText(ROUTING_INVALID)).toBeInTheDocument()
    expect(routing).toHaveClass('is-invalid')
  })
})
