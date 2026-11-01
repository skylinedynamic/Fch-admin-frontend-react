import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import InvoicePaymentModal from '../../../../src/pages/invoices/components/InvoicePaymentModal'

vi.mock('bootstrap/js/dist/modal', () => ({
  default: class {
    show() {}
    hide() {}
    dispose() {}
  },
}))

const getStripe = vi.fn((..._args: unknown[]) => new Promise(() => {}))
vi.mock('../../../../src/lib/stripe', () => ({ getStripe: (...args: unknown[]) => getStripe(...args) }))

const invoice = { id: 7, invoice_id: 'INV-7', payment_amount: 800 }

const countPaymentMethodRequests = () => {
  const requested = vi.fn()
  server.use(
    http.get('*/payment/get-payment-methods', () => {
      requested()
      // A single provider is auto-selected - the path that used to load Stripe.
      return HttpResponse.json({ status: true, data: [{ id: 1, name: 'Stripe', publishable_key: 'pk_test' }] })
    })
  )
  return requested
}

describe('InvoicePaymentModal', () => {
  beforeEach(() => {
    getStripe.mockClear()
  })

  it('loads nothing while it is hidden, even with an invoice selected', async () => {
    const requested = countPaymentMethodRequests()

    render(<InvoicePaymentModal show={false} onHide={() => {}} onSuccess={() => {}} invoice={invoice} />)

    // Give any effect a chance to fire before asserting it did not.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(requested).not.toHaveBeenCalled()
    expect(getStripe).not.toHaveBeenCalled()
    expect(screen.queryByText('Select Payment Method')).not.toBeInTheDocument()
  })

  it('loads the payment methods once it is shown', async () => {
    const requested = countPaymentMethodRequests()

    render(<InvoicePaymentModal show onHide={() => {}} onSuccess={() => {}} invoice={invoice} />)

    await waitFor(() => expect(requested).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(getStripe).toHaveBeenCalledWith('pk_test'))
  })
})
