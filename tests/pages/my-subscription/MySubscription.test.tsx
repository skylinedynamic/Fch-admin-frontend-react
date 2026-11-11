import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { toast } from 'react-toastify'
import MySubscription from '../../../src/pages/my-subscription/MySubscription'
import { RESUME_CONFIRM_MESSAGE } from '../../../src/pages/my-subscription/components/ResumeSubscription'
import { RESUME_RESULT } from '../../../src/modules/my-subscription'
import { useAuthStore } from '../../../src/store/auth'

const DETAILS = '/common/my-subscription'
const CANCEL = '/common/my-subscription/cancel-subscription'

const subscription = (over: Record<string, unknown> = {}) => ({
  id: 1, status: 'Active', enrollment_type: 'Monthly', payable_amount: '$499.00', monthly_platform_fee: '$99.00',
  subscription_start_date: '2026-01-01', subscription_end_date: '2026-12-31', ...over,
})

const mount = (data: Record<string, unknown> = { subscription: subscription(), recent_payments: [], partner: { id: 5 } }) => {
  signIn({ is_host: 0, partner_id: 5, entity_type: 'Partner', first_payment_date: '2026-01-01' })
  allowBackgroundCalls()
  const details = api('get', DETAILS, { status: true, data })
  const view = renderPage(<MySubscription />, { path: '/my-subscription' })
  return { details, ...view }
}

beforeEach(() => vi.clearAllMocks())

describe('MySubscription', () => {
  it('shows the plan, the amounts and the dates', async () => {
    mount()

    expect(await screen.findByText('Active Subscription Plan: Monthly')).toBeInTheDocument()
    expect(screen.getAllByText('$499.00').length).toBeGreaterThan(0)
    expect(screen.getByText('$99.00')).toBeInTheDocument()
    expect(screen.getByText('2026-01-01')).toBeInTheDocument()
  })

  // BUG-049: the monthly installment is rounded to the cent and the last one
  // takes up the difference (6696.70 over 12: 558.06 a month, the last 558.04).
  it('shows the monthly installment and the adjusted last one on an installment plan', async () => {
    mount({
      subscription: subscription({ enrollment_type: 'Installment', installment_count: 12, subscription_amount_per_month: '$558.06', final_installment_amount: '$558.04' }),
      recent_payments: [],
      partner: { id: 5 },
    })

    expect(await screen.findByText('Monthly Installment')).toBeInTheDocument()
    expect(screen.getByText('$558.06')).toBeInTheDocument()
    expect(screen.getByText('Last Installment')).toBeInTheDocument()
    expect(screen.getByText('$558.04')).toBeInTheDocument()
  })

  it('shows no last installment when the plan splits evenly', async () => {
    mount({
      subscription: subscription({ enrollment_type: 'Installment', installment_count: 3, subscription_amount_per_month: '$300.00', final_installment_amount: null }),
      recent_payments: [],
      partner: { id: 5 },
    })

    expect(await screen.findByText('Monthly Installment')).toBeInTheDocument()
    expect(screen.queryByText('Last Installment')).not.toBeInTheDocument()
  })

  it('shows an empty payment history', async () => {
    mount()

    expect(await screen.findByText('No payment history found')).toBeInTheDocument()
  })

  it('shows N/A for amounts the API did not send', async () => {
    mount({ subscription: subscription({ payable_amount: null, monthly_platform_fee: null }), recent_payments: [] })

    await screen.findByText(/Active Subscription Plan:/)
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(2)
  })

  it('cancels after confirmation and reloads the details', async () => {
    const user = userEvent.setup()
    const { details } = mount()
    const cancel = api('post', CANCEL, { status: true })
    await screen.findByText(/Active Subscription Plan:/)
    const loadsBefore = details.calls

    await user.click(screen.getByRole('button', { name: /cancel subscription/i }))
    await user.click(await screen.findByRole('button', { name: 'Yes, Cancel Subscription' }))

    await waitFor(() => expect(cancel.calls).toBe(1))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Subscription cancelled successfully'))
    await waitFor(() => expect(details.calls).toBeGreaterThan(loadsBefore))
  })

  it('"Keep Subscription" backs out without calling the API', async () => {
    const user = userEvent.setup()
    mount()
    const cancel = api('post', CANCEL, { status: true })
    await screen.findByText(/Active Subscription Plan:/)

    await user.click(screen.getByRole('button', { name: /cancel subscription/i }))
    await user.click(await screen.findByRole('button', { name: 'Keep Subscription' }))

    expect(cancel.calls).toBe(0)
  })

  it('shows the API message when the cancellation is refused', async () => {
    const user = userEvent.setup()
    mount()
    api('post', CANCEL, { status: false, message: 'You have an unpaid invoice.' }, 422)
    await screen.findByText(/Active Subscription Plan:/)

    await user.click(screen.getByRole('button', { name: /cancel subscription/i }))
    await user.click(await screen.findByRole('button', { name: 'Yes, Cancel Subscription' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('You have an unpaid invoice.'))
  })

  it.each([
    ['cancelled', { status: 'Cancelled' }],
    ['completed', { status: 'Completed' }],
    ['expired', { status: 'Expired' }],
    ['flagged complete by the API', { is_completed: true }],
  ])('offers no cancel button once the subscription is %s', async (_label, over) => {
    mount({ subscription: subscription(over), recent_payments: [] })

    await screen.findByText(/Active Subscription Plan:/)
    expect(screen.queryByRole('button', { name: /cancel subscription/i })).not.toBeInTheDocument()
  })

  it('shows the API message when the details cannot be loaded', async () => {
    signIn({ is_host: 0, partner_id: 5, entity_type: 'Partner', first_payment_date: '2026-01-01' })
    allowBackgroundCalls()
    api('get', DETAILS, { status: false, message: 'Subscription service unavailable.' }, 500)
    renderPage(<MySubscription />, { path: '/my-subscription' })

    expect(await screen.findByText('Subscription service unavailable.')).toBeInTheDocument()
  })

  // BUG-069: a cancelled subscription is resumed from here, on its current plan.
  describe('resuming a cancelled subscription', () => {
    const RESUME = '/common/my-subscription/resume-subscription'
    const cancelled = { subscription: subscription({ status: 'Cancelled' }), recent_payments: [], partner: { id: 5 } }

    it('offers Resume instead of Cancel once cancelled', async () => {
      mount(cancelled)

      expect(await screen.findByRole('button', { name: /resume subscription/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /cancel subscription/i })).not.toBeInTheDocument()
    })

    it('offers no Resume while active', async () => {
      mount()

      await screen.findByText(/Active Subscription Plan:/)
      expect(screen.queryByRole('button', { name: /resume subscription/i })).not.toBeInTheDocument()
    })

    it('is active again at once before the end date, and the stored status is refreshed', async () => {
      const user = userEvent.setup()
      const { details } = mount(cancelled)
      const resume = api('post', RESUME, { status: true, message: 'Your subscription is active again.', data: { status: RESUME_RESULT.ACTIVE, invoice_id: null } })
      const refreshed = api('get', '/common/user-details', { status: true, data: { user: { subscription_status: 'Active', subscription_end_date: '2026-12-31' } } })
      await screen.findByText(/Active Subscription Plan:/)
      const loadsBefore = details.calls

      await user.click(screen.getByRole('button', { name: /resume subscription/i }))
      expect(await screen.findByText(RESUME_CONFIRM_MESSAGE)).toBeInTheDocument()
      await user.click(await screen.findByRole('button', { name: 'Yes, Resume' }))

      await waitFor(() => expect(resume.calls).toBe(1))
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Your subscription is active again.'))
      await waitFor(() => expect(refreshed.calls).toBeGreaterThan(0))
      await waitFor(() => expect(useAuthStore.getState().userSubscription?.subscription_status).toBe('Active'))
      await waitFor(() => expect(details.calls).toBeGreaterThan(loadsBefore))
    })

    it('takes the partner to the invoice to pay after the end date', async () => {
      const user = userEvent.setup()
      mount(cancelled)
      api('post', RESUME, { status: true, message: 'Pay the invoice to reactivate your subscription.', data: { status: RESUME_RESULT.PAYMENT_REQUIRED, invoice_id: 77 } })
      await screen.findByText(/Active Subscription Plan:/)

      await user.click(screen.getByRole('button', { name: /resume subscription/i }))
      await user.click(await screen.findByRole('button', { name: 'Yes, Resume' }))

      expect(await screen.findByTestId('landing')).toHaveTextContent('navigated:/invoices/77')
      expect(toast.info).toHaveBeenCalledWith('Pay the invoice to reactivate your subscription.')
    })

    it('shows the API message when resuming is refused', async () => {
      const user = userEvent.setup()
      mount(cancelled)
      api('post', RESUME, { status: false, message: 'Only a cancelled subscription can be resumed.' }, 400)
      await screen.findByText(/Active Subscription Plan:/)

      await user.click(screen.getByRole('button', { name: /resume subscription/i }))
      await user.click(await screen.findByRole('button', { name: 'Yes, Resume' }))

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Only a cancelled subscription can be resumed.'))
    })
  })
})

describe('MySubscription - layout and payment history', () => {
  // The plan section comes first, then the bill / upcoming / payment method cards.
  it('shows the plan section above the summary cards', async () => {
    mount()

    const plan = await screen.findByText('Active Subscription Plan: Monthly')
    const cards = screen.getByText('Current / Recent Bill')
    expect(plan.compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // Recent Payments History holds the partner's plan, seat and borrower fee
  // payments, each with the invoice type name the API sends.
  it('names the invoice type of each payment', async () => {
    mount({
      subscription: subscription(),
      partner: { id: 5 },
      recent_payments: [
        { id: 1, invoice_no: 'INV-1', invoice_type: 'enrollment', invoice_type_label: 'Enrollment', amount: '$499.00', status: 'SUCCEEDED', created_at: '2026-01-01' },
        { id: 2, invoice_no: 'INV-2', invoice_type: 'user_seat', invoice_type_label: 'User Seat', amount: '$49.00', status: 'SUCCEEDED', created_at: '2026-02-01' },
        { id: 3, invoice_no: 'INV-3', invoice_type: 'borrower_fee', invoice_type_label: 'Client Activation Fee', amount: '$800.00', status: 'SUCCEEDED', created_at: '2026-03-01' },
      ],
    })

    expect(await screen.findByRole('columnheader', { name: 'INVOICE TYPE' })).toBeInTheDocument()
    const row = (invoice: string) => screen.getByText(invoice).closest('tr') as HTMLElement
    expect(row('INV-1')).toHaveTextContent('Enrollment')
    expect(row('INV-2')).toHaveTextContent('User Seat')
    expect(row('INV-3')).toHaveTextContent('Client Activation Fee')
  })

  // BUG-194 retest: the $800 fee still read "Borrower Fee" here. The page now
  // shows the API's name, never the stored type turned into words.
  it('shows the borrower fee as a Client Activation Fee and never as Borrower Fee', async () => {
    mount({
      subscription: subscription(),
      partner: { id: 5 },
      recent_payments: [
        { id: 3, invoice_no: 'INV-3', invoice_type: 'borrower_fee', invoice_type_label: 'Client Activation Fee', amount: '$800.00', status: 'SUCCEEDED', created_at: '2026-03-01' },
        { id: 4, invoice_no: 'INV-4', invoice_type: null, invoice_type_label: '', amount: '$10.00', status: 'SUCCEEDED', created_at: '2026-03-02' },
      ],
    })

    const row = (invoice: string) => screen.getByText(invoice).closest('tr') as HTMLElement
    await screen.findByText('INV-3')
    expect(row('INV-3')).toHaveTextContent('Client Activation Fee')
    expect(row('INV-3')).not.toHaveTextContent('Borrower Fee')
    expect(row('INV-4')).toHaveTextContent('-')
  })
})
