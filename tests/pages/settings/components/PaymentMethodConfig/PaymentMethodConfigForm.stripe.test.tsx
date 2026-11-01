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

import { toast } from 'react-toastify'
import PaymentMethodConfigForm from '../../../../../src/pages/settings/components/PaymentMethodConfig/PaymentMethodConfigForm'

/**
 * Settings -> Payment Integration -> Stripe. Saving asks Stripe whether the
 * keys work; when Stripe says no, the API's message lands under the key it is
 * about (configuration.<mode>.publishable_key / secret_key) as well as in the
 * toast.
 */
const STRIPE = { id: 1, name: 'Stripe', slug: 'stripe', logo: null, status: true, is_default: false, is_configured: true }
const SECRET_REJECTED = 'Stripe did not accept the Sandbox secret key. Copy it again from your Stripe dashboard (Developers > API keys).'
const PUBLISHABLE_REJECTED = 'Stripe did not accept the Sandbox publishable key. Copy it again from your Stripe dashboard (Developers > API keys).'

function mount() {
  useAuthStore.setState({ token: 't', user: { id: 1, is_host: 1, entity_type: 'Partner', partner_id: 1, permissions: [] } } as never)
  server.use(
    http.get('*/common/partner-payment-providers/1', () =>
      HttpResponse.json({
        status: true,
        data: { id: 3, status: true, is_default: false, payment_mode: 'sandbox', configuration: { sandbox: { publishable_key: 'pk_test_abc', secret_key: 'sk_test_abc' } }, bank_details: [] },
      })
    )
  )
  renderWithProviders(<PaymentMethodConfigForm provider={STRIPE} onBack={() => {}} />)
}

const rejectWith = (field: string, message: string) =>
  server.use(
    http.post('*/common/partner-payment-providers', () =>
      HttpResponse.json({ status: false, message, errors: { [field]: message } }, { status: 422 })
    )
  )

beforeEach(() => vi.clearAllMocks())

describe('PaymentMethodConfigForm - Stripe keys Stripe rejects', () => {
  it('shows a rejected secret key error under the Secret Key field', async () => {
    const user = userEvent.setup()
    mount()
    const secret = await screen.findByDisplayValue('sk_test_abc')
    rejectWith('configuration.sandbox.secret_key', SECRET_REJECTED)

    await user.click(screen.getByRole('button', { name: /save configuration/i }))

    expect(await screen.findByText(SECRET_REJECTED)).toBeInTheDocument()
    expect(secret).toHaveClass('is-invalid')
    expect(screen.getByDisplayValue('pk_test_abc')).not.toHaveClass('is-invalid')
    expect(toast.error).toHaveBeenCalledWith(SECRET_REJECTED)
  })

  it('shows a rejected publishable key error under the Publishable Key field', async () => {
    const user = userEvent.setup()
    mount()
    const publishable = await screen.findByDisplayValue('pk_test_abc')
    rejectWith('configuration.sandbox.publishable_key', PUBLISHABLE_REJECTED)

    await user.click(screen.getByRole('button', { name: /save configuration/i }))

    expect(await screen.findByText(PUBLISHABLE_REJECTED)).toBeInTheDocument()
    expect(publishable).toHaveClass('is-invalid')
  })

  it('clears the error once the key is edited', async () => {
    const user = userEvent.setup()
    mount()
    const secret = await screen.findByDisplayValue('sk_test_abc')
    rejectWith('configuration.sandbox.secret_key', SECRET_REJECTED)
    await user.click(screen.getByRole('button', { name: /save configuration/i }))
    await screen.findByText(SECRET_REJECTED)

    await user.type(secret, 'x')

    await waitFor(() => expect(screen.queryByText(SECRET_REJECTED)).not.toBeInTheDocument())
  })
})
