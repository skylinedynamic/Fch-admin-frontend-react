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
import PaymentDetails from '../../../src/pages/payments/PaymentDetails'

const PAYMENT = { id: 901, transaction_id: 'TXN-901', invoice_id: 'INV-1001', amount: '$499.00', status: 'Processing', can_approve: true }
const NOTE = /Enter approval details or rejection reason/
const REQUIRED = 'Note / Rejection reason is required for rejection.'

const mount = (permissions = ['view payments', 'can approve payment'], payment: Record<string, unknown> = PAYMENT) => {
  signIn({ permissions })
  allowBackgroundCalls()
  api('get', '/common/payments/901', { status: true, data: payment })
  return renderPage(<PaymentDetails />, { path: '/payments/:id', route: '/payments/901' })
}

beforeEach(() => vi.clearAllMocks())

describe('PaymentDetails - decision panel', () => {
  it('is shown for a payment awaiting approval', async () => {
    mount()

    expect(await screen.findByRole('button', { name: /approve payment/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject payment/i })).toBeInTheDocument()
  })

  it('is hidden without the approve permission', async () => {
    mount(['view payments'])

    await screen.findAllByText(/Payment Details/)
    expect(screen.queryByRole('button', { name: /approve payment/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reject payment/i })).not.toBeInTheDocument()
  })

  it('is hidden when the payment can no longer be approved', async () => {
    mount(['view payments', 'can approve payment'], { ...PAYMENT, status: 'Paid', can_approve: false })

    await screen.findAllByText(/Payment Details/)
    expect(screen.queryByRole('button', { name: /approve payment/i })).not.toBeInTheDocument()
  })
})

describe('PaymentDetails - approve', () => {
  it('confirms, posts the trimmed note and hides the panel afterwards', async () => {
    const user = userEvent.setup()
    mount()
    const approve = api('post', '/common/payments/901/approve', {
      status: true, message: 'Payment approved successfully!', data: { ...PAYMENT, status: 'Paid', can_approve: false },
    })

    await user.type(await screen.findByPlaceholderText(NOTE), '  Wire ref 12345  ')
    await user.click(screen.getByRole('button', { name: /approve payment/i }))
    expect(approve.calls).toBe(0)
    await user.click(await screen.findByRole('button', { name: /confirm & approve/i }))

    await waitFor(() => expect(approve.bodies[0]).toEqual({ note: 'Wire ref 12345' }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Payment approved successfully!'))
    await waitFor(() => expect(screen.queryByRole('button', { name: /approve payment/i })).not.toBeInTheDocument())
  })

  it('needs no note to approve', async () => {
    const user = userEvent.setup()
    mount()
    const approve = api('post', '/common/payments/901/approve', { status: true, data: PAYMENT })

    await user.click(await screen.findByRole('button', { name: /approve payment/i }))
    await user.click(await screen.findByRole('button', { name: /confirm & approve/i }))

    await waitFor(() => expect(approve.bodies[0]).toEqual({ note: '' }))
    expect(screen.queryByText(REQUIRED)).not.toBeInTheDocument()
  })

  it('shows the API message when the approval fails', async () => {
    const user = userEvent.setup()
    mount()
    api('post', '/common/payments/901/approve', { status: false, message: 'Payment was already approved.' }, 409)

    await user.click(await screen.findByRole('button', { name: /approve payment/i }))
    await user.click(await screen.findByRole('button', { name: /confirm & approve/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Payment was already approved.'))
  })
})

describe('PaymentDetails - reject', () => {
  it('requires a reason before the confirmation opens', async () => {
    const user = userEvent.setup()
    mount()
    const reject = api('post', '/common/payments/901/reject', { status: true })

    await user.click(await screen.findByRole('button', { name: /reject payment/i }))

    expect(await screen.findByText(REQUIRED)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(NOTE)).toHaveClass('is-invalid')
    expect(screen.queryByRole('button', { name: /confirm & reject/i })).not.toBeInTheDocument()
    expect(reject.calls).toBe(0)
  })

  it('does not accept a whitespace-only reason', async () => {
    const user = userEvent.setup()
    mount()

    await user.type(await screen.findByPlaceholderText(NOTE), '    ')
    await user.click(screen.getByRole('button', { name: /reject payment/i }))

    expect(await screen.findByText(REQUIRED)).toBeInTheDocument()
  })

  it('clears the error once a reason is typed', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(await screen.findByRole('button', { name: /reject payment/i }))
    expect(await screen.findByText(REQUIRED)).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText(NOTE), 'Wrong amount')

    expect(screen.queryByText(REQUIRED)).not.toBeInTheDocument()
  })

  it('confirms and posts the reason as both reason and note', async () => {
    const user = userEvent.setup()
    mount()
    const reject = api('post', '/common/payments/901/reject', {
      status: true, message: 'Payment rejected.', data: { ...PAYMENT, status: 'Rejected', can_approve: false },
    })

    await user.type(await screen.findByPlaceholderText(NOTE), 'Amount does not match the invoice')
    await user.click(screen.getByRole('button', { name: /reject payment/i }))
    await user.click(await screen.findByRole('button', { name: /confirm & reject/i }))

    await waitFor(() =>
      expect(reject.bodies[0]).toEqual({ reason: 'Amount does not match the invoice', note: 'Amount does not match the invoice' })
    )
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Payment rejected.'))
  })
})

describe('PaymentDetails - loading', () => {
  it('reports a payment that cannot be loaded', async () => {
    signIn({ permissions: ['view payments'] })
    allowBackgroundCalls()
    api('get', '/common/payments/901', { message: 'boom' }, 500)
    renderPage(<PaymentDetails />, { path: '/payments/:id', route: '/payments/901' })

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error loading payment details'))
    expect(await screen.findByText('Payment Not Found')).toBeInTheDocument()
  })
})
