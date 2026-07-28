import React, { useState, useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { processUnifiedPayment } from '../../../modules/invoice/services';
import { refreshSubscription } from '../../../lib/auth';
import { toast } from 'react-toastify';
import PaymentProviderSelector from './PaymentProviderSelector';
import { AuthorizeNetForm, SquareForm, EcryptForm, StripeForm } from './PaymentMethodForms';

const isStripeProvider = (provider) => provider?.name?.toLowerCase() === 'stripe';
const isAuthorizeNetProvider = (provider) => ['authorize.net', 'authorizenet', 'authorize'].includes(provider?.name?.toLowerCase());
const isSquareProvider = (provider) => provider?.name?.toLowerCase() === 'square';
const isEcryptProvider = (provider) => provider?.name?.toLowerCase() === 'ecrypt';



export default function InvoicePaymentModal({ show, onHide, onSuccess, invoice }) {
  const modalRef = useRef(null);
  const modalInstanceRef = useRef(null);
  const [selectedProvider, setSelectedProvider] = useState(null);

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
    }
  }, [show]);

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
  };

  const handleBackToProviders = () => {
    setSelectedProvider(null);
    setClientSecret(null);
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
                  <StripeForm
                    amount={amount}
                    invoice={invoice}
                    selectedProvider={selectedProvider}
                    onPaymentSuccess={onSuccess}
                    onCancel={onHide}
                  />
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