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
import { processInvoicePayment, fetchPartnerPaymentMethods } from '../../../modules/invoice/services';
import { purchaseUserSeats } from '../../../modules/user/services';
import { refreshSubscription } from '../../../lib/auth';
import { toast } from 'react-toastify';
import { ENTITY_TYPE_USER_MODEL, ENTITY_TYPE_EMPLOYEE } from '../../../config/appConfig';

const isStripeProvider = (provider) => provider?.name?.toLowerCase() === 'stripe';

const ProviderCard = ({ provider, onSelect }) => (
  <button
    type="button"
    className="btn btn-light border w-100 p-3 mb-2 text-start d-flex align-items-center"
    onClick={() => onSelect(provider)}
  >
    {provider.logo ? (
      <img
        src={provider.logo}
        alt={provider.name}
        style={{ maxHeight: '30px', maxWidth: '80px', objectFit: 'contain' }}
        className="me-3"
      />
    ) : (
      <span className="avatar-sm bg-primary bg-opacity-10 text-primary rounded d-flex align-items-center justify-content-center me-3">
        <i className="ri-secure-payment-line fs-18"></i>
      </span>
    )}
    <span className="fw-semibold">{provider.name}</span>
    {provider.is_default && (
      <span className="badge bg-success-subtle text-success ms-auto">Default</span>
    )}
  </button>
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

      const isUserSeatPayment = invoice?.entity_type?.includes(ENTITY_TYPE_USER_MODEL) ||
        invoice?.entity_type?.includes(ENTITY_TYPE_EMPLOYEE);

      const payload = {
        amount: Math.round(amount * 100), // convert to cents
        currency: 'USD',
        payment_method_id: paymentMethod.id,
        description: `Invoice Payment #${invoice?.invoice_id} - ${invoice?.customer_name}`,
        invoice_id: invoice?.id,
        entity_id: invoice?.entity_id,
        entity_type: invoice?.entity_type,
        partner_id: invoice?.partner_id,
        provider_id: selectedProvider?.id,
        ...(isUserSeatPayment ? { user_id: invoice?.entity_id } : {})
      };

      const response = isUserSeatPayment
        ? await purchaseUserSeats(payload)
        : await processInvoicePayment(payload);

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
          disabled={!stripe || isProcessing}
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
  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providerError, setProviderError] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);

  // Calculate amount safely
  const amount = invoice ? (typeof invoice.payment_amount === 'string'
    ? parseFloat(invoice.payment_amount.replace(/[^0-9.]/g, ''))
    : (parseFloat(invoice.payment_amount) || 0)) : 0;

  // Initialize Bootstrap modal instance
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

  // Show/hide modal
  useEffect(() => {
    const modal = modalInstanceRef.current;
    if (!modal) return;
    if (show) {
      modal.show();
    } else {
      modal.hide();
    }
  }, [show]);

  // Load active providers for the invoice's partner
  useEffect(() => {
    if (!show || !invoice) return;

    const loadProviders = async () => {
      setProvidersLoading(true);
      setProviderError(null);
      setSelectedProvider(null);

      try {
        const response = await fetchPartnerPaymentMethods();
          if (response.status) {
          const list = response.data || [];
          setProviders(list);

          if (list.length === 1) {
            setSelectedProvider(list[0]);
          }
        } else {
          setProviderError(response.message || 'Failed to load payment providers');
          toast.error(response.message || 'Failed to load payment providers');
        }
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to load payment providers';
        setProviderError(message);
        toast.error(message);
      } finally {
        setProvidersLoading(false);
      }
    };

    loadProviders();
  }, [show, invoice?.id]);

  // Initialize Stripe only when Stripe provider is selected
  useEffect(() => {
    if (selectedProvider && isStripeProvider(selectedProvider) && !stripePromise) {
      const initStripe = async () => {
        const promise = await getStripe();
        setStripePromise(promise);
      };
      initStripe();
    }
  }, [selectedProvider, stripePromise]);

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
  };

  const handleBackToProviders = () => {
    setSelectedProvider(null);
  };

  return (
    <div className="modal fade stripe-payment-modal" ref={modalRef} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header border-0 p-3 pb-0">
            <h5 className="modal-title fs-16 fw-semibold">
              {selectedProvider ? 'Complete Payment' : 'Select Payment Method'}
            </h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <div className="modal-body p-4 text-center pt-0">
            {!selectedProvider ? (
              <>
                <div className="mb-3">
                  <span className="avatar-title bg-primary bg-opacity-10 text-primary rounded-circle fs-1 d-inline-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
                    <i className="ri-secure-payment-line"></i>
                  </span>
                </div>
                <p className="stripe-modal-desc mb-4">
                  Choose how you would like to pay <strong>USD ${amount.toFixed(2)}</strong> for invoice{' '}
                  <strong>{invoice?.invoice_id}</strong>.
                </p>

                {providersLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading payment providers...</span>
                    </div>
                    <p className="text-muted mt-2">Loading payment providers...</p>
                  </div>
                ) : providerError ? (
                  <div className="alert alert-danger" role="alert">
                    {providerError}
                  </div>
                ) : providers.length === 0 ? (
                  <div className="alert alert-warning" role="alert">
                    No active payment providers are available for this partner.
                  </div>
                ) : (
                  <div className="text-start">
                    {providers.map((provider) => (
                      <ProviderCard
                        key={provider.id}
                        provider={provider}
                        onSelect={handleProviderSelect}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="d-flex align-items-center mb-3">
                  <button
                    type="button"
                    className="btn btn-link text-muted p-0 text-decoration-none"
                    onClick={handleBackToProviders}
                  >
                    <i className="ri-arrow-left-line me-1"></i> Change method
                  </button>
                </div>

                <div className="d-flex align-items-center justify-content-center mb-4">
                  {selectedProvider.logo ? (
                    <img
                      src={selectedProvider.logo}
                      alt={selectedProvider.name}
                      style={{ maxHeight: '40px', maxWidth: '120px', objectFit: 'contain' }}
                    />
                  ) : (
                    <span className="fw-bold fs-18">{selectedProvider.name}</span>
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
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Initializing Stripe...</span>
                      </div>
                      <p className="text-muted mt-2">Initializing Stripe...</p>
                    </div>
                  )
                ) : (
                  <div className="alert alert-info" role="alert">
                    <i className="ri-information-line me-2"></i>
                    Payment through <strong>{selectedProvider.name}</strong> is currently handled outside of this interface.
                    Please contact support to complete this payment.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
