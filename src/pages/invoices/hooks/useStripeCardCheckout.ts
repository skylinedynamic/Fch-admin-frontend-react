import { useState } from 'react';
import type { Stripe } from '@stripe/stripe-js';
import { useConfirmAuthenticatedPayment, useProcessPayment } from '../../../modules/invoice';
import type { ProcessPaymentPayload } from '../../../modules/invoice';
import { PAYMENT_STATUS_SUCCEEDED } from '../../../config/paymentConfig';

/** Where a card checkout is up to - drives the Pay button's label. */
export const CHECKOUT_STAGE = {
  IDLE: 'idle',
  CHARGING: 'charging',
  /** The bank's 3-D Secure challenge (OTP) is open - BUG-066. */
  AUTHENTICATING: 'authenticating',
} as const;

export type CheckoutStage = (typeof CHECKOUT_STAGE)[keyof typeof CHECKOUT_STAGE];

export const CHECKOUT_OUTCOME = {
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  /** The bank has not answered yet; the API settles the payment on its own. */
  PENDING: 'pending',
} as const;

export type CheckoutOutcome =
  | { status: typeof CHECKOUT_OUTCOME.SUCCEEDED; paymentId?: number }
  | { status: typeof CHECKOUT_OUTCOME.FAILED; message: string }
  | { status: typeof CHECKOUT_OUTCOME.PENDING; message: string };

const DEFAULT_FAILURE = 'Failed to process payment';
const DEFAULT_PENDING = 'Your bank is still verifying this payment. We will update the invoice as soon as it is done.';

const apiMessage = (err: unknown, fallback: string): string => {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
};

/**
 * Pays an invoice with a Stripe card, including cards whose bank asks for
 * 3-D Secure (BUG-066):
 *
 *  1. the payment method goes to the API, which charges it;
 *  2. if the bank wants the cardholder, the API answers `requires_action` with
 *     the PaymentIntent's client secret, and Stripe.js runs the bank's
 *     challenge (stripe.handleNextAction);
 *  3. however the challenge ended, the API is asked to confirm - it reads the
 *     outcome from Stripe, so the browser's view is never trusted on its own.
 */
export function useStripeCardCheckout() {
  const [stage, setStage] = useState<CheckoutStage>(CHECKOUT_STAGE.IDLE);
  const processPayment = useProcessPayment();
  const confirmPayment = useConfirmAuthenticatedPayment();

  const checkout = async (stripe: Stripe, payload: ProcessPaymentPayload): Promise<CheckoutOutcome> => {
    setStage(CHECKOUT_STAGE.CHARGING);

    try {
      const response = await processPayment.mutateAsync(payload);
      const result = response.data;

      if (!response.status) {
        return { status: CHECKOUT_OUTCOME.FAILED, message: response.message || DEFAULT_FAILURE };
      }

      if (!result?.requires_action) {
        return { status: CHECKOUT_OUTCOME.SUCCEEDED, paymentId: result?.payment_id };
      }

      if (!result.client_secret || !result.payment_id) {
        return { status: CHECKOUT_OUTCOME.FAILED, message: response.message || DEFAULT_FAILURE };
      }

      setStage(CHECKOUT_STAGE.AUTHENTICATING);
      const { error: challengeError } = await stripe.handleNextAction({ clientSecret: result.client_secret });

      try {
        const confirmed = await confirmPayment.mutateAsync(result.payment_id);

        if (confirmed.status && confirmed.data?.status === PAYMENT_STATUS_SUCCEEDED) {
          return { status: CHECKOUT_OUTCOME.SUCCEEDED, paymentId: confirmed.data.payment_id ?? result.payment_id };
        }

        // Not paid, and Stripe already said why (e.g. the challenge window was closed).
        if (challengeError?.message) {
          return { status: CHECKOUT_OUTCOME.FAILED, message: challengeError.message };
        }

        return { status: CHECKOUT_OUTCOME.PENDING, message: confirmed.message || DEFAULT_PENDING };
      } catch (err) {
        return { status: CHECKOUT_OUTCOME.FAILED, message: apiMessage(err, challengeError?.message || DEFAULT_FAILURE) };
      }
    } catch (err) {
      return { status: CHECKOUT_OUTCOME.FAILED, message: apiMessage(err, DEFAULT_FAILURE) };
    } finally {
      setStage(CHECKOUT_STAGE.IDLE);
    }
  };

  return { checkout, stage };
}
