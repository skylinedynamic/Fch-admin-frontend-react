import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { Stripe } from '@stripe/stripe-js'
import { server } from '../../../mocks/server'
import { createTestQueryClient } from '../../../test-utils'
import {
  CHECKOUT_OUTCOME,
  CHECKOUT_STAGE,
  useStripeCardCheckout,
} from '../../../../src/pages/invoices/hooks/useStripeCardCheckout'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
)

const payload = { payment_token: 'pm_1', invoice_id: 3, payment_method_id: 7 }

const stripeWith = (handleNextAction: ReturnType<typeof vi.fn>) => ({ handleNextAction }) as unknown as Stripe

const pay = (body: Record<string, unknown>, status = 200) =>
  server.use(http.post('*/payment/process', () => HttpResponse.json(body, { status })))

const confirm = (body: Record<string, unknown>, status = 200) =>
  server.use(http.post('*/payment/confirm', () => HttpResponse.json(body, { status })))

const needsAuthentication = () =>
  pay({ status: true, data: { success: false, requires_action: true, payment_id: 9, client_secret: 'pi_9_secret', status: 'pending' } })

describe('useStripeCardCheckout', () => {
  it('reports a plain card payment as succeeded without any bank step', async () => {
    pay({ status: true, data: { success: true, payment_id: 4, status: 'succeeded' } })
    const handleNextAction = vi.fn()
    const { result } = renderHook(() => useStripeCardCheckout(), { wrapper })

    const outcome = await result.current.checkout(stripeWith(handleNextAction), payload)

    expect(outcome).toEqual({ status: CHECKOUT_OUTCOME.SUCCEEDED, paymentId: 4 })
    expect(handleNextAction).not.toHaveBeenCalled()
  })

  it('runs the bank challenge, then lets the API settle it', async () => {
    needsAuthentication()
    confirm({ status: true, data: { success: true, payment_id: 9, status: 'succeeded' } })
    const handleNextAction = vi.fn().mockResolvedValue({ paymentIntent: { status: 'succeeded' } })
    const { result } = renderHook(() => useStripeCardCheckout(), { wrapper })

    const outcome = await result.current.checkout(stripeWith(handleNextAction), payload)

    expect(handleNextAction).toHaveBeenCalledWith({ clientSecret: 'pi_9_secret' })
    expect(outcome).toEqual({ status: CHECKOUT_OUTCOME.SUCCEEDED, paymentId: 9 })
  })

  it('is in the authenticating stage while the challenge is open, idle after', async () => {
    needsAuthentication()
    confirm({ status: true, data: { success: true, payment_id: 9, status: 'succeeded' } })
    let finishChallenge: (value: unknown) => void = () => {}
    const handleNextAction = vi.fn(() => new Promise((resolve) => { finishChallenge = resolve }))
    const { result } = renderHook(() => useStripeCardCheckout(), { wrapper })

    let done: Promise<unknown> = Promise.resolve()
    act(() => { done = result.current.checkout(stripeWith(handleNextAction), payload) })

    await waitFor(() => expect(result.current.stage).toBe(CHECKOUT_STAGE.AUTHENTICATING))
    await act(async () => { finishChallenge({ paymentIntent: { status: 'succeeded' } }); await done })
    expect(result.current.stage).toBe(CHECKOUT_STAGE.IDLE)
  })

  it('reports the API reason when the bank refuses', async () => {
    needsAuthentication()
    confirm({ status: false, message: 'We are unable to authenticate your payment method.' }, 400)
    const handleNextAction = vi.fn().mockResolvedValue({ error: { message: 'Stripe says no.' } })
    const { result } = renderHook(() => useStripeCardCheckout(), { wrapper })

    const outcome = await result.current.checkout(stripeWith(handleNextAction), payload)

    expect(outcome).toEqual({ status: CHECKOUT_OUTCOME.FAILED, message: 'We are unable to authenticate your payment method.' })
  })

  it('reports pending when the bank has not answered and Stripe saw no error', async () => {
    needsAuthentication()
    confirm({ status: true, message: 'Still verifying.', data: { success: false, payment_id: 9, status: 'pending' } })
    const handleNextAction = vi.fn().mockResolvedValue({ paymentIntent: { status: 'processing' } })
    const { result } = renderHook(() => useStripeCardCheckout(), { wrapper })

    const outcome = await result.current.checkout(stripeWith(handleNextAction), payload)

    expect(outcome).toEqual({ status: CHECKOUT_OUTCOME.PENDING, message: 'Still verifying.' })
  })

  it('reports a decline from the first call with its message', async () => {
    pay({ status: false, message: 'Your card was declined.' }, 400)
    const { result } = renderHook(() => useStripeCardCheckout(), { wrapper })

    const outcome = await result.current.checkout(stripeWith(vi.fn()), payload)

    expect(outcome).toEqual({ status: CHECKOUT_OUTCOME.FAILED, message: 'Your card was declined.' })
  })
})
