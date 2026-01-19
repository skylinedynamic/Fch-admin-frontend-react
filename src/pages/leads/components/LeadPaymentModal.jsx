import React, { useState, useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { loadStripe } from '@stripe/stripe-js';
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  Elements,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { getStripe } from '../../../lib/stripe';
import { processPayment } from '../../../modules/leads/services';
import { toast } from 'react-toastify';

const CheckoutForm = ({ amount, lead, borrowerId, onPaymentSuccess, onCancel, loading }) => {
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
          name: lead?.contact_person || lead?.contact_name || 'Borrower',
          email: lead?.email || '',
          phone: lead?.phone_number || '',
        },
      });

      if (error) {
        toast.error(error.message);
        setIsProcessing(false);
        return;
      }

      const response = await processPayment({
        amount: amount * 100, // convert to cents
        currency: 'usd',
        payment_method_id: paymentMethod.id,
        description: `Enrollment Fee for Borrower ${borrowerId} - ${lead?.contact_person || lead?.contact_name}`,
        entity_id: borrowerId,
        entity_type: 'borrower'
      });

      if (response.status) {
        toast.success("Payment completed successfully!");
        onPaymentSuccess(response.data?.id || response.data?.payment_intent_id);
      } else {
        toast.error(response.message || "Payment failed");
      }
    } catch (err) {
      console.error('Payment Error:', err);
      toast.error(err.response?.data?.message || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="text-start">
      <div className="mb-4">
        <label className="form-label fw-medium mb-2">Card Number</label>
        <div className="p-3 border rounded-3 bg-white shadow-sm overflow-hidden">
          <CardNumberElement
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
          <label className="form-label fw-medium mb-2">Expiration Date</label>
          <div className="p-3 border rounded-3 bg-white shadow-sm">
            <CardExpiryElement
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
          <label className="form-label fw-medium mb-2">CVC</label>
          <div className="p-3 border rounded-3 bg-white shadow-sm">
            <CardCvcElement
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

      <div className="d-flex flex-column gap-3 mt-4">
        <div className="d-flex align-items-center justify-content-between p-3 bg-primary bg-opacity-10 rounded-3">
          <div className="d-flex flex-column">
              <span className="text-muted small">Total to Pay</span>
              <h4 className="mb-0 text-primary fw-bold">${amount}</h4>
          </div>
          <div className="avatar-sm">
            <span className="avatar-title bg-primary text-white rounded-circle fs-4">
              <i className="ri-secure-payment-line"></i>
            </span>
          </div>
        </div>

        <div className="hstack gap-2 justify-content-center">
            <button
                type="button"
                className="btn btn-link text-muted fw-medium"
                onClick={onCancel}
                disabled={isProcessing || loading}
            >
                <i className="ri-arrow-left-line me-1"></i> Back
            </button>
            <button
                type="submit"
                className="btn btn-primary btn-lg rounded-3 px-4"
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
      </div>
    </form>
  );
};

export default function LeadPaymentModal({ show, onHide, onSuccess, lead, borrowerId, amount }) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);
    const [stripePromise, setStripePromise] = useState(null);

    useEffect(() => {
        const initStripe = async () => {
          const promise = await getStripe();
          setStripePromise(promise);
        };
        initStripe();
    }, []);

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
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header border-0 p-3 pb-0">
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body p-4 text-center">
                        <div className="mb-4">
                            <div className="avatar-title bg-soft-primary text-primary rounded-circle fs-1 mx-auto" style={{ width: '80px', height: '80px', background: '#eef2ff' }}>
                                <i className="ri-lock-password-line" style={{ fontSize: '40px' }}></i>
                            </div>
                        </div>
                        <h4 className="mb-2 fw-bold">Secure Checkout</h4>
                        <p className="text-muted mb-4 px-3">
                            Complete the enrollment for <strong>{lead?.contact_person || lead?.contact_name}</strong> by processing the secure payment below.
                        </p>

                        {stripePromise ? (
                          <Elements stripe={stripePromise}>
                            <CheckoutForm 
                              amount={amount} 
                              lead={lead} 
                              borrowerId={borrowerId}
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
