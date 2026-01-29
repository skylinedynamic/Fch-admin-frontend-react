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
import { processInvoicePayment } from '../../../modules/invoice/services';
import { refreshUser } from '../../../lib/auth';
import { toast } from 'react-toastify';

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

    //   console.log('Invoice Payment Payload:', {
    //     amount: amount * 100, // convert to cents
    //     currency: 'usd',
    //     payment_method_id: paymentMethod.id,
    //     description: `Invoice Payment #${invoice?.invoice_id} - ${invoice?.customer_name}`,
    //     invoice_id: invoice?.id,
    //   });

      const response = await processInvoicePayment({
        amount: amount * 100, // convert to cents
        currency: 'usd',
        payment_method_id: paymentMethod.id,
        description: `Invoice Payment #${invoice?.invoice_id} - ${invoice?.customer_name}`,
        invoice_id: invoice?.id, // Send the internal ID
        entity_id: invoice?.id, // For consistency if backend expects entity_id
        entity_type: invoice?.entity_type, // If backend requires type
      });

      if (response.status) {
        toast.success("Payment completed successfully!");
        // Refresh user details to unlock features
        await refreshUser();
        onPaymentSuccess(response.data?.id || response.data?.payment_intent_id);
        // Force reload to ensure all states (like subscription restrictions) are fresh
        window.location.reload();
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

export default function InvoicePaymentModal({ show, onHide, onSuccess, invoice }) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);
    const [stripePromise, setStripePromise] = useState(null);

    // Calculate amount safely
    const amount = invoice ? (typeof invoice.payment_amount === 'string' 
        ? parseFloat(invoice.payment_amount) 
        : invoice.payment_amount) : 0;

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
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header border-0 p-3 pb-0">
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body p-4 text-center">
                        <div className="mb-4 text-center">
                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle shadow-sm" style={{ width: '80px', height: '80px', background: '#635bff' }}>
                                <svg width="45" height="45" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21.171 16.489c-1.527-.643-2.585-.921-2.585-1.748 0-.67.618-1.056 1.637-1.056 1.579 0 3.253.643 4.295 1.287l1.096-3.235c-1.25-.683-3.134-1.246-5.021-1.246-4.008 0-6.66 2.029-6.66 5.424 0 5.441 7.641 4.57 7.641 6.88 0 .863-.82 1.226-2.004 1.226-1.896 0-3.951-.884-5.233-1.667l-1.137 3.315c1.472.924 3.978 1.647 6.046 1.647 4.295 0 7.042-2.149 7.042-5.545 0-5.783-7.617-4.697-7.617-6.88z" fill="white"/>
                                </svg>
                            </div>
                        </div>
                        <h4 className="mb-2 fw-bold">Stripe Payment</h4>
                          <p className="text-muted mb-4 px-3">
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
