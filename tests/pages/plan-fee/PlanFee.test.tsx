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
import PlanFee from '../../../src/pages/plan-fee/PlanFee'

const FETCH = '/admin/plan-fee/fetch-subscription-plans'

const plan = (over: Record<string, unknown> = {}) => ({
  id: 11, partner_type: 'White-Label Partner (WL)', partner_type_slug: 'wl', enrollment_type: 'Monthly', enrollment_type_slug: 'monthly',
  entity_type: 'Partner', is_partner_paying: true, total_installments_count: null, subscription_period_month: 1,
  total_amount: '499.00', platform_fee: '99.00', total_installment_count_upto: null, total_seat_count: null,
  currency: 'USD', currency_symbol: '$', status: true, ...over,
})

const mount = (response: unknown = { status: true, data: { partner_enrollment: [plan()] } }) => {
  signIn()
  allowBackgroundCalls()
  const fetch = api('post', FETCH, response)
  const view = renderPage(<PlanFee />, { path: '/plan-and-fee' })
  return { fetch, ...view }
}

const amountInputs = (container: HTMLElement) => Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[]

beforeEach(() => vi.clearAllMocks())

describe('PlanFee', () => {
  it('loads the plans and shows the current amount and platform fee', async () => {
    const { container, fetch } = mount()

    await waitFor(() => expect(amountInputs(container).length).toBeGreaterThanOrEqual(2))
    expect(fetch.calls).toBe(1)
    const values = amountInputs(container).map((input) => input.value)
    expect(values).toContain('499.00')
    expect(values).toContain('99.00')
  })

  it('reports a failed load with the API message', async () => {
    mount({ status: false, message: 'Plans are unavailable.' })

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Plans are unavailable.'))
  })

  it('reports a server error on load', async () => {
    signIn()
    allowBackgroundCalls()
    api('post', FETCH, { message: 'boom' }, 500)
    renderPage(<PlanFee />, { path: '/plan-and-fee' })

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load subscription plans'))
  })

  it('says nothing changed when Save is pressed without an edit', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const update = api('put', '/admin/plan-fee/update-subscription-plan/11', { status: true })
    await waitFor(() => expect(amountInputs(container).length).toBeGreaterThanOrEqual(2))

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith('No changes detected for this plan.'))
    expect(update.calls).toBe(0)
  })

  it('asks for confirmation, then PUTs the edited amount', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const update = api('put', '/admin/plan-fee/update-subscription-plan/11', { status: true, message: 'Plan updated successfully' })
    await waitFor(() => expect(amountInputs(container).length).toBeGreaterThanOrEqual(2))
    const amount = amountInputs(container).find((input) => input.value === '499.00')!

    await user.clear(amount)
    await user.type(amount, '549')
    await user.click(screen.getByRole('button', { name: /^\W*save$/i }))
    expect(update.calls).toBe(0)
    await user.click(await screen.findByRole('button', { name: 'Confirm & Save' }))

    await waitFor(() => expect(update.bodies[0]).toMatchObject({ total_amount: 549, platform_fee: 99 }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plan updated successfully'))
  })

  it('sends include_existing_subscription only when the platform fee changes', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const update = api('put', '/admin/plan-fee/update-subscription-plan/11', { status: true })
    await waitFor(() => expect(amountInputs(container).length).toBeGreaterThanOrEqual(2))
    const fee = amountInputs(container).find((input) => input.value === '99.00')!

    await user.clear(fee)
    await user.type(fee, '129')
    await user.click(screen.getByRole('button', { name: /^\W*save$/i }))
    await user.click(await screen.findByRole('button', { name: 'Confirm & Save' }))

    await waitFor(() => expect(update.bodies[0]).toMatchObject({ platform_fee: 129, include_existing_subscription: false }))
  })

  it('Cancel in the confirmation does not save', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const update = api('put', '/admin/plan-fee/update-subscription-plan/11', { status: true })
    await waitFor(() => expect(amountInputs(container).length).toBeGreaterThanOrEqual(2))
    const amount = amountInputs(container).find((input) => input.value === '499.00')!

    await user.clear(amount)
    await user.type(amount, '549')
    await user.click(screen.getByRole('button', { name: /^\W*save$/i }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(update.calls).toBe(0)
  })

  it('reports a status:false response on save', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    api('put', '/admin/plan-fee/update-subscription-plan/11', { status: false, message: 'Amount is below the minimum.' })
    await waitFor(() => expect(amountInputs(container).length).toBeGreaterThanOrEqual(2))
    const amount = amountInputs(container).find((input) => input.value === '499.00')!

    await user.clear(amount)
    await user.type(amount, '1')
    await user.click(screen.getByRole('button', { name: /^\W*save$/i }))
    await user.click(await screen.findByRole('button', { name: 'Confirm & Save' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Amount is below the minimum.'))
  })
})
