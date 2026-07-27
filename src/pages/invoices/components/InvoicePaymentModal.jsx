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
import { processUnifiedPayment } from '../../../modules/invoice/services';
import { refreshSubscription } from '../../../lib/auth';
import { toast } from 'react-toastify';
import PaymentProviderSelector from './PaymentProviderSelector';
import { AuthorizeNetForm, SquareForm, EcryptForm } from './PaymentMethodForms';

const isStripeProvider = (provider) => provider?.name?.toLowerCase() === 'stripe';
const isAuthorizeNetProvider = (provider) => ['authorize.net', 'authorizenet', 'authorize'].includes(provider?.name?.toLowerCase());
const isSquareProvider = (provider) => provider?.name?.toLowerCase() === 'square';
const isEcryptProvider = (provider) => provider?.name?.toLowerCase() === 'ecrypt';

const CheckoutSkeleton = () => (
  <div className="ppm-form-skeleton">
    <div className="ppm-form-skeleton-label" />
    <div className="ppm-form-skeleton-input" />
    <div className="ppm-form-skeleton-label ppm-form-skeleton-label-half" />
    <div className="ppm-form-skeleton-row">
      <div className="ppm-form-skeleton-col">
        <div className="ppm-form-skeleton-label" />
        <div className="ppm-form-skeleton-input" />
      </div>
      <div className="ppm-form-skeleton-col ppm-form-skeleton-col-small">
        <div className="ppm-form-skeleton-label" />
        <div className="ppm-form-skeleton-input" />
      </div>
    </div>
    <div className="ppm-form-skeleton-summary" />
    <div className="ppm-form-skeleton-btn" />
  </div>
);

const CheckoutForm = ({ amount, invoice, selectedProvider, onPaymentSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumberFocused, setCardNumberFocused] = useState(false);
  const [cardExpiryFocused, setCardExpiryFocused] = useState(false);
  const [cardCvcFocused, setCardCvcFocused] = useState(false);

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

      const response = await processUnifiedPayment({
        provider_id: selectedProvider.id,
        invoice_id: invoice.id,
        payment_method_id: paymentMethod.id,
      });

      if (response.status) {
        toast.success("Payment completed successfully!");
        await refreshSubscription();
        onPaymentSuccess(response.data?.id || response.data?.payment_intent_id);
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
                base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } },
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
                  base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } },
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
                  base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } },
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
        <button type="submit" className="stripe-submit-btn" disabled={!stripe || isProcessing}>
          {isProcessing ? (
            <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Verifying...</>
          ) : (
            <><i className="ri-shield-check-line me-1"></i> Confirm & Pay</>
          )}
        </button>
      </div>
    </form>
  );
};

export default function InvoicePaymentModal({ show, onHide, onSuccess, invoice }) {
  const modalRef = useRef(null);
  const modalInstanceRef = useRef(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);

  const amount = invoice ? (typeof invoice.payment_amount === 'string'
    ? parseFloat(invoice.payment_amount.replace(/[^0-9.]/g, ''))
    : (parseFloat(invoice.payment_amount) || 0)) : 0;

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
    if (show) { modal.show(); } else { modal.hide(); }
  }, [show]);

  useEffect(() => {
    if (!show) {
      setSelectedProvider(null);
      setStripePromise(null);
    }
  }, [show]);

  useEffect(() => {
    if (selectedProvider && isStripeProvider(selectedProvider) && !stripePromise) {
      getStripe().then(setStripePromise);
    }
  }, [selectedProvider, stripePromise]);

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
  };

  const handleBackToProviders = () => {
    setSelectedProvider(null);
  };

  return (
    <div className="modal fade stripe-payment-modal ppm-modal" ref={modalRef} tabIndex="-1" aria-hidden="true">
      <div className={`modal-dialog modal-dialog-centered${selectedProvider ? ' ppm-gateway-dialog' : ''}`}>
        <div className="modal-content ppm-content">
          {!selectedProvider ? (
            <>
              <div className="ppm-card-header">
                <div className="d-flex align-items-center gap-3">
                  <div className="avatar-sm flex-shrink-0">
                    <div className="avatar-title bg-primary-subtle text-primary rounded fs-20 payment-method-avatar-title">
                      <i className="ri-bank-card-2-line"></i>
                    </div>
                  </div>
                  <div>
                    <h5 className="mb-0 fs-15 fw-semibold text-dark">Select Payment Method</h5>
                    <p className="text-muted mb-0 fs-12">
                      Invoice #{invoice?.invoice_id} &middot; USD ${amount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={onHide}></button>
              </div>

              <div className="ppm-card-body">
                <PaymentProviderSelector
                  invoice={invoice}
                  onSelect={handleProviderSelect}
                />
              </div>
            </>
          ) : (
            <>
              <div className="ppm-card-header">
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-link text-muted p-0 text-decoration-none"
                    onClick={handleBackToProviders}
                  >
                    <i className="ri-arrow-left-line fs-18"></i>
                  </button>
                  <div>
                    <h5 className="mb-0 fs-15 fw-semibold text-dark">Complete Payment</h5>
                    <p className="text-muted mb-0 fs-12">
                      {selectedProvider.name} &middot; Invoice #{invoice?.invoice_id} &middot; USD ${amount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={onHide}></button>
              </div>

              <div className="ppm-card-body">
                <div className="ppm-gateway-provider">
                  {selectedProvider.logo ? (
                    <img src={selectedProvider.logo} alt={selectedProvider.name} className="ppm-gateway-logo-img" />
                  ) : (
                    <span className="ppm-gateway-icon">
                      <i className="ri-secure-payment-line"></i>
                    </span>
                  )}
                </div>

                {isStripeProvider(selectedProvider) ? (
                  stripePromise ? (
                    <Elements stripe={stripePromise}>
                      <CheckoutForm
                        amount={amount}
                        invoice={invoice}
                        selectedProvider={selectedProvider}
                        onPaymentSuccess={onSuccess}
                        onCancel={onHide}
                      />
                    </Elements>
                  ) : (
                    <CheckoutSkeleton />
                  )
                ) : isAuthorizeNetProvider(selectedProvider) ? (
                  <AuthorizeNetForm
                    amount={amount}
                    invoice={invoice}
                    selectedProvider={selectedProvider}
                    onPaymentSuccess={onSuccess}
                    onCancel={onHide}
                  />
                ) : isSquareProvider(selectedProvider) ? (
                  <SquareForm
                    amount={amount}
                    invoice={invoice}
                    selectedProvider={selectedProvider}
                    onPaymentSuccess={onSuccess}
                    onCancel={onHide}
                  />
                ) : isEcryptProvider(selectedProvider) ? (
                  <EcryptForm
                    amount={amount}
                    invoice={invoice}
                    selectedProvider={selectedProvider}
                    onPaymentSuccess={onSuccess}
                    onCancel={onHide}
                  />
                ) : (
                  <div className="text-center py-4">
                    <div className="alert alert-info mb-0">
                      <i className="ri-information-line me-2"></i>
                      Payment through <strong>{selectedProvider.name}</strong> is not yet supported in this interface.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}