import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import InvoicePaymentModal from '../../../../src/pages/invoices/components/InvoicePaymentModal'
import { REACTIVATION_NOTICE, withReactivationRefresh } from '../../../../src/pages/invoices/components/ReactivationNotice'
import { useAuthStore } from '../../../../src/store/auth'

vi.mock('bootstrap/js/dist/modal', () => ({
  default: class {
    show() {}
    hide() {}
    dispose() {}
  },
}))
vi.mock('../../../../src/lib/stripe', () => ({ getStripe: () => new Promise(() => {}) }))

/**
 * BUG-069: paying an invoice a cancelled partner subscription still has open
 * makes it active again. The payment modal says so first, and once paid the
 * stored status is refreshed so the portal unlocks.
 */
const twoProviders = () =>
  server.use(
    http.get('*/payment/get-payment-methods', () =>
      HttpResponse.json({ status: true, data: [{ id: 1, name: 'Stripe', publishable_key: 'pk_test' }, { id: 2, name: 'Bank Transfer' }] })
    )
  )

afterEach(() => {
  server.resetHandlers()
  useAuthStore.setState({ token: null, user: null, userSubscription: null } as never)
})

describe('Paying an invoice that reactivates a cancelled subscription', () => {
  it('warns before the payment', async () => {
    twoProviders()
    render(<InvoicePaymentModal show onHide={() => {}} onSuccess={() => {}} invoice={{ id: 7, invoice_id: 'INV-7', payment_amount: 299, reactivates_subscription: true }} />)

    expect(await screen.findByRole('alert', { hidden: true })).toHaveTextContent(REACTIVATION_NOTICE)
  })

  it('says nothing for an ordinary invoice', async () => {
    twoProviders()
    render(<InvoicePaymentModal show onHide={() => {}} onSuccess={() => {}} invoice={{ id: 7, invoice_id: 'INV-7', payment_amount: 299, reactivates_subscription: false }} />)

    expect(await screen.findByText('Select Payment Method')).toBeInTheDocument()
    expect(screen.queryByText(REACTIVATION_NOTICE)).not.toBeInTheDocument()
  })

  it('refreshes the stored subscription once such an invoice is paid', async () => {
    useAuthStore.setState({ token: 't', user: { id: 1 }, userSubscription: { subscription_status: 'Cancelled' } } as never)
    server.use(http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: { user: { subscription_status: 'Active' } } })))
    const onSuccess = vi.fn()

    withReactivationRefresh({ reactivates_subscription: true }, onSuccess)('paid')

    expect(onSuccess).toHaveBeenCalledWith('paid')
    await waitFor(() => expect(useAuthStore.getState().userSubscription?.subscription_status).toBe('Active'))
  })

  it('refreshes nothing after an ordinary payment', async () => {
    const refreshed = vi.fn()
    server.use(http.get('*/common/user-details', () => { refreshed(); return HttpResponse.json({ status: true, data: { user: {} } }) }))
    const onSuccess = vi.fn()

    withReactivationRefresh({ reactivates_subscription: false }, onSuccess)()

    expect(onSuccess).toHaveBeenCalledOnce()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(refreshed).not.toHaveBeenCalled()
  })
})
