import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import MySubscription from '../../../src/pages/my-subscription/MySubscription'

// ConfirmationModal drives Bootstrap's real Modal, whose transition callbacks
// fire after the page has unmounted. A synchronous fake, as in
// EditConfirmationModal.test.tsx.
vi.mock('bootstrap/js/dist/modal', () => {
  class FakeModal {
    private el: HTMLElement
    constructor(el: HTMLElement) {
      this.el = el
    }
    show() {
      this.el.classList.add('show')
      this.el.style.display = 'block'
      this.el.removeAttribute('aria-hidden')
    }
    hide() {
      this.el.classList.remove('show')
      this.el.style.display = 'none'
      this.el.setAttribute('aria-hidden', 'true')
    }
    dispose() {}
  }
  return { default: FakeModal }
})

const details = (partner: Record<string, unknown>) => ({
  status: true,
  data: {
    partner: { id: 7, name: 'Pat Partner', ...partner },
    subscription: { id: 3, status: 'Active', enrollment_type: 'Monthly', installment_count: 1, installments_paid: 1 },
    recent_bill: null,
    upcoming_billing: null,
    recent_payments: [],
  },
})

const withStripeCard = {
  default_payment_method: 'Stripe',
  payment_provider: { name: 'Stripe', logo: null },
  stripe_card_info: { customer_id: 'cus_1', name: 'Visa', card_no: '**** 4242' },
}
const withNoDefault = { default_payment_method: null, payment_provider: null, stripe_card_info: { customer_id: null, name: null, card_no: null } }

afterEach(() => server.resetHandlers())

// A heavy page: under a full parallel run it can take longer than findBy's 1s default.
const SLOW = { timeout: 5000 }

describe('My Subscription - remove the default payment method', () => {
  it('removes the default after a warning, then shows that none is set', async () => {
    let current: Record<string, unknown> = withStripeCard
    const remove = vi.fn()
    server.use(
      http.get('*/common/my-subscription', () => HttpResponse.json(details(current))),
      http.post('*/common/my-subscription/remove-default-payment-method', () => {
        remove()
        current = withNoDefault
        return HttpResponse.json({ status: true, message: 'Default payment method removed.', data: { default_payment_method: null } })
      })
    )
    const user = userEvent.setup()
    renderWithProviders(<MySubscription />, { route: '/my-subscription' })

    await user.click(await screen.findByRole('button', { name: /^remove$/i }, SLOW))
    expect(await screen.findByText(/will not be charged automatically/i, undefined, SLOW)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /yes, remove it/i }))

    await waitFor(() => expect(remove).toHaveBeenCalledOnce(), SLOW)
    expect(await screen.findByText(/no default payment method/i, undefined, SLOW)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument()
  })

  it('shows no gateway, and nothing to remove, when no default is set', async () => {
    server.use(http.get('*/common/my-subscription', () => HttpResponse.json(details(withNoDefault))))
    renderWithProviders(<MySubscription />, { route: '/my-subscription' })

    expect(await screen.findByText(/no default payment method/i, undefined, SLOW)).toBeInTheDocument()
    expect(screen.queryByText('Sandbox Card')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument()
  })
})
