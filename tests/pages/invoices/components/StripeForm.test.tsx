import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { renderWithProviders } from '../../../test-utils'

// Stripe's SDK is the one external piece mocked: its card field is an iframe
// and its 3-D Secure challenge a bank page. The portal's own HTTP goes through
// the real apiClient, answered by MSW. Partner portal: /payment/process and
// /payment/confirm.
const mockStripe = { createPaymentMethod: vi.fn(), handleNextAction: vi.fn() }
const mockElements = { getElement: vi.fn(() => ({})) }

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CardElement: (props: any) => (
    <div data-testid="card-element" onClick={() => props.onChange?.({ complete: true })} />
  ),
  useStripe: () => mockStripe,
  useElements: () => mockElements,
}))

vi.mock('../../../../src/lib/stripe', () => ({
  getStripe: vi.fn(() => Promise.resolve({})),
}))

const toastError = vi.fn()
const toastSuccess = vi.fn()
const toastInfo = vi.fn()
vi.mock('react-toastify', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
    info: (...args: unknown[]) => toastInfo(...args),
  },
}))

import { StripeForm } from '../../../../src/pages/invoices/components/StripeForm'

const invoice = { id: 42 }
const selectedProvider = { id: 7, publishable_key: 'pk_test_123' }

/** Records the bodies the portal posts, so a test can check what left the browser. */
const posted: Record<string, unknown[]> = {}
const record = (key: string, body: unknown) => {
  posted[key] = [...(posted[key] ?? []), body]
}

const payAnswers = (body: Record<string, unknown>, status = 200) =>
  server.use(
    http.post('*/payment/process', async ({ request }) => {
      record('pay', await request.json())
      return HttpResponse.json(body, { status })
    })
  )

const confirmAnswers = (body: Record<string, unknown>, status = 200) =>
  server.use(
    http.post('*/payment/confirm', async ({ request }) => {
      record('confirm', await request.json())
      return HttpResponse.json(body, { status })
    })
  )

/** The API's answer for a card whose bank wants 3-D Secure. */
const needsAuthentication = () =>
  payAnswers({
    status: true,
    message: 'Your bank needs to verify this payment.',
    data: { success: false, requires_action: true, payment_id: 501, transaction_id: 'pi_3ds', client_secret: 'pi_3ds_secret_abc', status: 'pending' },
  })

const renderForm = () => {
  const onPaymentSuccess = vi.fn()
  const onCancel = vi.fn()
  const utils = renderWithProviders(
    <StripeForm
      amount={100}
      invoice={invoice}
      selectedProvider={selectedProvider}
      onPaymentSuccess={onPaymentSuccess}
      onCancel={onCancel}
    />
  )
  return { ...utils, onPaymentSuccess, onCancel }
}

const clickPay = async () => {
  const user = userEvent.setup()
  const card = await screen.findByTestId('card-element')
  await user.click(card) // marks the CardElement complete via onChange
  await user.click(screen.getByRole('button', { name: /Pay \$100\.00/i }))
}

describe('StripeForm', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.keys(posted).forEach((key) => delete posted[key])
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload: vi.fn() },
    })
    mockStripe.createPaymentMethod.mockResolvedValue({ paymentMethod: { id: 'pm_abc123' }, error: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: originalLocation })
  })

  it('renders a loading state until the Stripe SDK resolves, then the card field', async () => {
    renderForm()
    expect(screen.getByText(/Initializing secure payment gateway/i)).toBeInTheDocument()
    expect(await screen.findByTestId('card-element')).toBeInTheDocument()
  })

  it('submits only the Stripe payment method id — never raw card data', async () => {
    payAnswers({ status: true, message: 'Payment processed successfully.', data: { success: true, payment_id: 999, status: 'succeeded' } })
    const { onPaymentSuccess } = renderForm()

    await clickPay()

    await waitFor(() => expect(onPaymentSuccess).toHaveBeenCalledWith(999))
    expect(posted.pay).toEqual([{ payment_token: 'pm_abc123', invoice_id: 42, payment_method_id: 7, save_card: false }])
    expect(JSON.stringify(posted.pay)).not.toMatch(/cardNumber|cvv/)
    expect(toastSuccess).toHaveBeenCalledWith('Payment completed successfully!')
    expect(mockStripe.handleNextAction).not.toHaveBeenCalled()
    expect(posted.confirm).toBeUndefined()
    expect(window.location.reload).toHaveBeenCalled()
  })

  // The card is kept as the payer's default only when this box is ticked.
  it('offers to save the card as the default payment method, unticked by default', async () => {
    renderForm()

    const box = await screen.findByRole('checkbox', { name: 'Save card as default payment method' })
    expect(box).not.toBeChecked()
  })

  it('sends save_card when the box is ticked', async () => {
    payAnswers({ status: true, message: 'Payment processed successfully.', data: { success: true, payment_id: 999, status: 'succeeded' } })
    const { onPaymentSuccess } = renderForm()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('checkbox', { name: 'Save card as default payment method' }))
    await clickPay()

    await waitFor(() => expect(onPaymentSuccess).toHaveBeenCalledWith(999))
    expect(posted.pay).toEqual([{ payment_token: 'pm_abc123', invoice_id: 42, payment_method_id: 7, save_card: true }])
  })

  it('shows an error toast and does not call the payment API when Stripe rejects the card', async () => {
    mockStripe.createPaymentMethod.mockResolvedValue({ paymentMethod: null, error: { message: 'Your card was declined.' } })
    renderForm()

    await clickPay()

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Your card was declined.'))
    expect(posted.pay).toBeUndefined()
  })

  it('shows the API reason and cancels when the backend declines the card', async () => {
    payAnswers({ status: false, message: 'Your card was declined.' }, 400)
    const { onCancel } = renderForm()

    await clickPay()

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Your card was declined.'))
    expect(onCancel).toHaveBeenCalled()
  })

  // ── BUG-066: cards whose bank asks for 3-D Secure (OTP) ───────────────────

  it('runs the bank challenge and confirms the payment once it is verified', async () => {
    needsAuthentication()
    mockStripe.handleNextAction.mockResolvedValue({ paymentIntent: { id: 'pi_3ds', status: 'succeeded' } })
    confirmAnswers({ status: true, message: 'Payment processed successfully.', data: { success: true, payment_id: 501, status: 'succeeded' } })
    const { onPaymentSuccess, onCancel } = renderForm()

    await clickPay()

    await waitFor(() => expect(onPaymentSuccess).toHaveBeenCalledWith(501))
    expect(mockStripe.handleNextAction).toHaveBeenCalledWith({ clientSecret: 'pi_3ds_secret_abc' })
    expect(posted.confirm).toEqual([{ payment_id: 501 }])
    expect(toastSuccess).toHaveBeenCalledWith('Payment completed successfully!')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('tells the payer the bank is verifying while the challenge is open', async () => {
    needsAuthentication()
    mockStripe.handleNextAction.mockReturnValue(new Promise(() => {})) // the challenge stays open
    renderForm()

    await clickPay()

    expect(await screen.findByText(/Waiting for your bank/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Waiting for your bank/i })).toBeDisabled()
  })

  it('shows the bank\'s reason when the verification fails', async () => {
    needsAuthentication()
    mockStripe.handleNextAction.mockResolvedValue({
      error: { message: 'We are unable to authenticate your payment method.' },
    })
    confirmAnswers({ status: false, message: 'We are unable to authenticate your payment method.' }, 400)
    const { onPaymentSuccess, onCancel } = renderForm()

    await clickPay()

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('We are unable to authenticate your payment method.'))
    // The API decides the outcome, so it is asked even when the browser saw an error.
    expect(posted.confirm).toEqual([{ payment_id: 501 }])
    expect(onCancel).toHaveBeenCalled()
    expect(onPaymentSuccess).not.toHaveBeenCalled()
  })

  it('says the payment is still being verified when the bank has not answered yet', async () => {
    needsAuthentication()
    mockStripe.handleNextAction.mockResolvedValue({ paymentIntent: { id: 'pi_3ds', status: 'processing' } })
    confirmAnswers({ status: true, message: 'Your bank has not finished verifying this payment yet.', data: { success: false, payment_id: 501, status: 'pending' } })
    const { onPaymentSuccess, onCancel } = renderForm()

    await clickPay()

    await waitFor(() => expect(toastInfo).toHaveBeenCalledWith('Your bank has not finished verifying this payment yet.'))
    expect(onPaymentSuccess).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })

  it('uses Stripe\'s own message when the challenge could not even start', async () => {
    needsAuthentication()
    mockStripe.handleNextAction.mockResolvedValue({ error: { message: 'The authentication window was closed.' } })
    confirmAnswers({ status: true, message: 'Your bank has not finished verifying this payment yet.', data: { success: false, payment_id: 501, status: 'pending' } })
    const { onCancel } = renderForm()

    await clickPay()

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('The authentication window was closed.'))
    expect(onCancel).toHaveBeenCalled()
  })
})
