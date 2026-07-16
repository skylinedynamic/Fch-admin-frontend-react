import React, { useState, useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  Elements,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { getStripe } from '../../../lib/stripe';
import { processInvoicePayment } from '../../../modules/invoice/services';
import { purchaseUserSeats } from '../../../modules/user/services';
import { refreshSubscription } from '../../../lib/auth';
import { toast } from 'react-toastify';
import { ENTITY_TYPE_USER_MODEL, ENTITY_TYPE_EMPLOYEE } from '../../../config/appConfig';
import stripeLogo from '../../../../assets/images/stripe_logo.png';

const CheckoutForm = ({ amount, invoice, onPaymentSuccess, onCancel, loading }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const cardNumberElement = elements.getElement(CardNumberElement);

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
        billing_details: {
          name: invoice?.customer_name || 'Customer',
          email: invoice?.email || '',
          phone: invoice?.phone || '',
        },
      });

      if (error) {
        toast.error(error.message);
        setIsProcessing(false);
        return;
      }

      const isUserSeatPayment = invoice?.entity_type?.includes(ENTITY_TYPE_USER_MODEL) ||
        invoice?.entity_type?.includes(ENTITY_TYPE_EMPLOYEE);

      const payload = {
        amount: Math.round(amount * 100), // convert to cents
        currency: 'USD',
        payment_method_id: paymentMethod.id,
        description: `Invoice Payment #${invoice?.invoice_id} - ${invoice?.customer_name}`,
        invoice_id: invoice?.id, // Send the internal ID
        entity_id: invoice?.entity_id, // Corrected: Use invoice's entity_id
        entity_type: invoice?.entity_type,
        partner_id: invoice?.partner_id,
        ...(isUserSeatPayment ? { user_id: invoice?.entity_id } : {})
      };

      const response = isUserSeatPayment
        ? await purchaseUserSeats(payload)
        : await processInvoicePayment(payload);

      if (response.status) {
        toast.success("Payment completed successfully!");
        // Refresh user details to unlock features
        await refreshSubscription();
        onPaymentSuccess(response.data?.id || response.data?.payment_intent_id);
        // Force reload to ensure all states (like subscription restrictions) are fresh
        window.location.reload();
      } else {
        toast.error(response.message || "Payment failed");
        onCancel();
      }
    } catch (err) {
      console.error('Payment Error:', err);
      toast.error(err.response?.data?.message || 'Failed to process payment');
      onCancel();
    } finally {
      setIsProcessing(false);
    }
  };

  const [cardNumberFocused, setCardNumberFocused] = useState(false);
  const [cardExpiryFocused, setCardExpiryFocused] = useState(false);
  const [cardCvcFocused, setCardCvcFocused] = useState(false);

  return (
    <form onSubmit={handleSubmit} className="text-start">
      <div className="mb-4">
        <label className="stripe-field-label">Card Number</label>
        <div className={`stripe-input-container ${cardNumberFocused ? 'focused' : ''}`}>
          <CardNumberElement
            onFocus={() => setCardNumberFocused(true)}
            onBlur={() => setCardNumberFocused(false)}
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': { color: '#aab7c4' },
                },
                invalid: { color: '#9e2146' },
              },
            }}
          />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-7">
          <label className="stripe-field-label">Expiration Date</label>
          <div className={`stripe-input-container ${cardExpiryFocused ? 'focused' : ''}`}>
            <CardExpiryElement
              onFocus={() => setCardExpiryFocused(true)}
              onBlur={() => setCardExpiryFocused(false)}
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': { color: '#aab7c4' },
                  },
                  invalid: { color: '#9e2146' },
                },
              }}
            />
          </div>
        </div>
        <div className="col-5">
          <label className="stripe-field-label">CVC</label>
          <div className={`stripe-input-container ${cardCvcFocused ? 'focused' : ''}`}>
            <CardCvcElement
              onFocus={() => setCardCvcFocused(true)}
              onBlur={() => setCardCvcFocused(false)}
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': { color: '#aab7c4' },
                  },
                  invalid: { color: '#9e2146' },
                },
              }}
            />
          </div>
        </div>
      </div>

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

      <div className="hstack gap-2 justify-content-center">
        <button
          type="submit"
          className="stripe-submit-btn"
          disabled={!stripe || isProcessing || loading}
        >
          {isProcessing ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Verifying...
            </>
          ) : (
            <>
              <i className="ri-shield-check-line me-1"></i> Confirm & Pay
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default function InvoicePaymentModal({ show, onHide, onSuccess, invoice }) {
  const modalRef = useRef(null);
  const modalInstanceRef = useRef(null);
  const [stripePromise, setStripePromise] = useState(null);

  // Calculate amount safely
  const amount = invoice ? (typeof invoice.payment_amount === 'string'
    ? parseFloat(invoice.payment_amount.replace(/[^0-9.]/g, ''))
    : (parseFloat(invoice.payment_amount) || 0)) : 0;

  useEffect(() => {
    if (show && !stripePromise) {
      const initStripe = async () => {
        const promise = await getStripe();
        setStripePromise(promise);
      };
      initStripe();
    }
  }, [show, stripePromise]);

  useEffect(() => {
    if (!modalRef.current) return;
    if (!modalInstanceRef.current) {
      modalInstanceRef.current = new Modal(modalRef.current, {
        backdrop: 'static',
        keyboard: false,
      });
    }

    return () => {
      if (modalInstanceRef.current) {
        modalInstanceRef.current.hide();
        modalInstanceRef.current.dispose();
        modalInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const modal = modalInstanceRef.current;
    if (!modal) return;
    if (show) {
      modal.show();
    } else {
      modal.hide();
    }
  }, [show]);

  return (
    <div className="modal fade stripe-payment-modal" ref={modalRef} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header border-0 p-3 pb-0">
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <div className="modal-body p-4 text-center pt-0">
            <div className="stripe-logo-header">
              <img src={stripeLogo} alt="Stripe" className="stripe-logo-image" />
            </div>
            <p className="stripe-modal-desc mb-4">
              Complete the enrollment for <strong>{invoice?.customer_name}</strong> by securely processing the payment below.
            </p>

            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <CheckoutForm
                  amount={amount}
                  invoice={invoice}
                  onPaymentSuccess={onSuccess}
                  onCancel={onHide}
                />
              </Elements>
            ) : (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading Stripe...</span>
                </div>
                <p className="text-muted mt-2">Initializing Stripe...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
