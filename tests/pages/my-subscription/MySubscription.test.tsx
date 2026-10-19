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
})
