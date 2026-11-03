import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import type { Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '../../../lib/stripe';
import { CHECKOUT_OUTCOME, CHECKOUT_STAGE, useStripeCardCheckout } from '../hooks/useStripeCardCheckout';
import type { CheckoutStage } from '../hooks/useStripeCardCheckout';

/*
 * Card payments through Stripe Elements: the card number never touches this
 * app, only Stripe's payment method token. Cards whose bank asks for 3-D Secure
 * are verified in the browser and settled by the API (BUG-066).
 */

interface StripeFormProps {
  amount: number;
  invoice: { id: number | string };
  selectedProvider: { id: number; publishable_key?: string };
  onPaymentSuccess: (paymentId?: number) => void;
  onCancel: () => void;
}

/* ── Summary + Pay button ── */

const PaymentSummary = ({ amount }: { amount: number }) => (
  <div className="stripe-summary-card">
    <div className="d-flex flex-column">
      <span className="stripe-summary-title">Total to Pay</span>
      <h4 className="stripe-summary-amount mb-0">${amount.toFixed(2)}</h4>
    </div>
    <div className="avatar-sm">
      <span className="avatar-title bg-primary text-white rounded-circle fs-4">
        <i className="ri-secure-payment-line"></i>
      </span>
    </div>
  </div>
);

interface PayButtonProps {
  amount: number;
  disabled: boolean;
  onClick: () => void;
  stage: CheckoutStage;
}

const PayButton = ({ amount, disabled, onClick, stage }: PayButtonProps) => {
  const busy = stage !== CHECKOUT_STAGE.IDLE;

  return (
    <div className="hstack gap-2 justify-content-center">
      <button
        type="button"
        className="stripe-submit-btn"
        disabled={disabled || busy}
        onClick={onClick}
      >
        {busy ? (
          <>
            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>{' '}
            {stage === CHECKOUT_STAGE.AUTHENTICATING ? 'Waiting for your bank to verify...' : 'Processing...'}
          </>
        ) : (
          <><i className="ri-shield-check-line me-1"></i> Pay ${amount.toFixed(2)}</>
        )}
      </button>
    </div>
  );
};

/* ── Stripe form ── */

export const StripeForm = ({ amount, invoice, selectedProvider, onPaymentSuccess, onCancel }: StripeFormProps) => {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | Stripe | null>(null);

  useEffect(() => {
    if (selectedProvider?.publishable_key) {
      getStripe(selectedProvider.publishable_key).then((stripe) => setStripePromise(stripe));
    }
  }, [selectedProvider]);

  if (!stripePromise) {
    return (
      <div className="text-center py-4">
        <span className="spinner-border spinner-border-sm text-primary" role="status" />
        <span className="ms-2">Initializing secure payment gateway...</span>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <StripeCardFormInner
        amount={amount}
        invoice={invoice}
        selectedProvider={selectedProvider}
        onPaymentSuccess={onPaymentSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
};

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#495057',
      fontFamily: 'Inter, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '15px',
      '::placeholder': {
        color: '#adb5bd',
      },
    },
    invalid: {
      color: '#f06548',
      iconColor: '#f06548',
    },
  },
  hidePostalCode: true,
};

const StripeCardFormInner = ({ amount, invoice, selectedProvider, onPaymentSuccess, onCancel }: StripeFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [tokenizing, setTokenizing] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const { checkout, stage } = useStripeCardCheckout();

  const handlePay = async () => {
    if (!stripe || !elements) return;

    setTokenizing(true);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not loaded');
      }

      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error || !paymentMethod) {
        toast.error(error?.message || 'Failed to authorize card details');
        return;
      }

      // Only Stripe's token leaves the browser (E2E-017). A card whose bank wants
      // 3-D Secure is verified inside checkout() (BUG-066).
      const outcome = await checkout(stripe, {
        payment_token: paymentMethod.id,
        invoice_id: invoice.id,
        payment_method_id: selectedProvider.id,
      });

      if (outcome.status === CHECKOUT_OUTCOME.SUCCEEDED) {
        toast.success('Payment completed successfully!');
        onPaymentSuccess(outcome.paymentId);
        window.location.reload();
      } else if (outcome.status === CHECKOUT_OUTCOME.PENDING) {
        toast.info(outcome.message);
        onCancel();
      } else {
        toast.error(outcome.message);
        onCancel();
      }
    } catch (err) {
      toast.error((err as Error)?.message || 'Failed to process payment');
      onCancel();
    } finally {
      setTokenizing(false);
    }
  };

  return (
    <div className="card-detail-form text-start">
      <div className="mb-4">
        <label className="stripe-field-label mb-2">Card Information</label>
        <div className="card-detail-input py-3 px-2 border rounded bg-light">
          <CardElement
            options={CARD_ELEMENT_OPTIONS}
            onChange={(e) => setIsValid(e.complete)}
          />
        </div>
      </div>
      <PaymentSummary amount={amount} />
      <PayButton
        amount={amount}
        disabled={!isValid}
        stage={tokenizing && stage === CHECKOUT_STAGE.IDLE ? CHECKOUT_STAGE.CHARGING : stage}
        onClick={handlePay}
      />
    </div>
  );
};
