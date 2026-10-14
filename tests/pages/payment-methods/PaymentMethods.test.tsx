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
import PaymentMethods from '../../../src/pages/payment-methods/PaymentMethods'

const PROVIDERS = [
  { id: 1, name: 'Stripe', logo: '', status: true },
  { id: 2, name: 'Bank Transfer', logo: '', status: false },
]

const mount = (providers: unknown = { status: true, data: PROVIDERS }) => {
  signIn()
  allowBackgroundCalls()
  api('get', '/admin/payment-methods', providers)
  return renderPage(<PaymentMethods />, { path: '/payment-methods' })
}

const toggle = (container: HTMLElement, id: number) => container.querySelector(`#provider-status-${id}`) as HTMLInputElement

beforeEach(() => vi.clearAllMocks())

describe('PaymentMethods', () => {
  it('lists each gateway with its enabled state', async () => {
    const { container } = mount()

    expect(await screen.findByRole('heading', { name: 'Stripe' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bank Transfer' })).toBeInTheDocument()
    expect(toggle(container, 1)).toBeChecked()
    expect(toggle(container, 2)).not.toBeChecked()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('asks for confirmation before changing a gateway', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const update = api('post', '/admin/payment-methods/1', { status: true })
    await screen.findByRole('heading', { name: 'Stripe' })

    await user.click(toggle(container, 1))

    expect(await screen.findByText('Confirm Status Change')).toBeInTheDocument()
    expect(screen.getByText('Immediate Checkout Impact')).toBeInTheDocument()
    expect(update.calls).toBe(0)
    expect(toggle(container, 1)).toBeChecked()
  })

  it('disables an enabled gateway once confirmed', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const update = api('post', '/admin/payment-methods/1', { status: true })
    await screen.findByRole('heading', { name: 'Stripe' })

    await user.click(toggle(container, 1))
    await user.click(await screen.findByRole('button', { name: 'Disable Gateway' }))

    await waitFor(() => expect(update.bodies[0]).toEqual({ status: false }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Stripe status updated successfully.'))
    await waitFor(() => expect(toggle(container, 1)).not.toBeChecked())
  })

  it('enables a disabled gateway once confirmed', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const update = api('post', '/admin/payment-methods/2', { status: true })
    await screen.findByRole('heading', { name: 'Bank Transfer' })

    await user.click(toggle(container, 2))
    await user.click(await screen.findByRole('button', { name: 'Enable Gateway' }))

    await waitFor(() => expect(update.bodies[0]).toEqual({ status: true }))
    await waitFor(() => expect(toggle(container, 2)).toBeChecked())
  })

  it('Cancel leaves the gateway as it was', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const update = api('post', '/admin/payment-methods/1', { status: true })
    await screen.findByRole('heading', { name: 'Stripe' })

    await user.click(toggle(container, 1))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(update.calls).toBe(0)
    expect(toggle(container, 1)).toBeChecked()
  })

  it('keeps the switch unchanged when the API reports failure', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    api('post', '/admin/payment-methods/1', { status: false, message: 'At least one gateway must stay enabled.' })
    await screen.findByRole('heading', { name: 'Stripe' })

    await user.click(toggle(container, 1))
    await user.click(await screen.findByRole('button', { name: 'Disable Gateway' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('At least one gateway must stay enabled.'))
    expect(toggle(container, 1)).toBeChecked()
  })

  it('reports a server error on update', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    api('post', '/admin/payment-methods/1', { message: 'boom' }, 500)
    await screen.findByRole('heading', { name: 'Stripe' })

    await user.click(toggle(container, 1))
    await user.click(await screen.findByRole('button', { name: 'Disable Gateway' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error updating provider status'))
  })

  it('reports a failed load with the API message', async () => {
    mount({ status: false, message: 'Gateways are unavailable.' })

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Gateways are unavailable.'))
  })
})
