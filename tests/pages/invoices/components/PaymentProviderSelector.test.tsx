import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { renderWithProviders, screen, waitFor } from '../../../test-utils'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import PaymentProviderSelector from '../../../../src/pages/invoices/components/PaymentProviderSelector'

/**
 * The invoice payment modal's list of payment methods. The API only lists the
 * methods that can take a payment - one switched on but not set up (Stripe
 * without usable keys, Bank Transfer without an account) is left out - so the
 * list shows what it gets, and an empty one means there is nothing to pay with.
 */
const serve = (data: unknown[]) =>
  server.use(http.get('*/payment/get-payment-methods', () => HttpResponse.json({ status: true, message: 'ok', data })))

beforeEach(() => vi.clearAllMocks())

describe('PaymentProviderSelector', () => {
  it('shows a card per method the API offers', async () => {
    serve([
      { id: 1, name: 'Stripe', publishable_key: 'pk_test_abc' },
      { id: 2, name: 'Cash Payment' },
    ])

    renderWithProviders(<PaymentProviderSelector invoice={{ id: 5 }} onSelect={vi.fn()} />)

    expect(await screen.findByText('Stripe')).toBeInTheDocument()
    expect(screen.getByText('Cash Payment')).toBeInTheDocument()
  })

  it('says online payment is not available when no method can take one', async () => {
    serve([])
    const onSelect = vi.fn()

    renderWithProviders(<PaymentProviderSelector invoice={{ id: 5 }} onSelect={onSelect} />)

    expect(await screen.findByText("Online payment isn't available for this invoice right now. Please contact support to arrange payment.")).toBeInTheDocument()
    await waitFor(() => expect(onSelect).not.toHaveBeenCalled())
  })
})
