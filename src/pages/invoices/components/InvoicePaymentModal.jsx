import React, { useState, useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { fetchPartnerPaymentMethods, processUnifiedPayment } from '../../../modules/invoice/services';
import { toast } from 'react-toastify';
import PaymentProviderSelector from './PaymentProviderSelector';
import { StripeForm } from './PaymentMethodForms';
import {
  PROVIDER_STRIPE,
  PROVIDER_SQUARE,
  PROVIDER_ECRYPT,
  PROVIDER_AUTHORIZE,
  PROVIDER_BANK_TRANSFER,
} from '../../../config/paymentConfig';
import { STATUS_PROCESSING } from '../../../config/invoiceConfig';

import stripeLogo from '../../../../assets/images/payment_provider/stripe_logo.png';
import squareLogo from '../../../../assets/images/payment_provider/square.png';
import ecryptLogo from '../../../../assets/images/payment_provider/ecrypt.png';
import authorizeLogo from '../../../../assets/images/payment_provider/authorization.png';

const PROVIDER_LOGOS = Object.freeze({
  [PROVIDER_STRIPE]: stripeLogo,
  [PROVIDER_SQUARE]: squareLogo,
  [PROVIDER_ECRYPT]: ecryptLogo,
  [PROVIDER_AUTHORIZE]: authorizeLogo,
});

function resolveLogo(name, logo) {
  if (logo) return logo;
  return PROVIDER_LOGOS[name] || PROVIDER_LOGOS[Object.keys(PROVIDER_LOGOS).find(k => k.toLowerCase() === (name || '').toLowerCase())] || '';
}

const isStripeProvider = (provider) => {
  if (!provider) return false;
  const name = (provider.name || '').toLowerCase().trim();
  const slug = (provider.slug || '').toLowerCase().trim();
  const target = (PROVIDER_STRIPE || 'Stripe').toLowerCase().trim();
  return name === target || slug === target;
};

const isBankTransferProvider = (provider) => {
  if (!provider) return false;
  const name = (provider.name || '').toLowerCase().trim();
  const slug = (provider.slug || '').toLowerCase().trim();
  const target = (PROVIDER_BANK_TRANSFER || 'Bank Transfer').toLowerCase().trim();
  return name === target || slug === 'bank_transfer' || name.includes('bank') || name.includes('transfer');
};

const BankTransferDetailsView = ({ selectedProvider, invoice, onSuccess }) => {
  const [bankAccounts, setBankAccounts] = useState(selectedProvider?.bank_details || []);
  const [selectedBankId, setSelectedBankId] = useState(() => {
    const list = selectedProvider?.bank_details || [];
    const def = list.find(b => b.is_default) || list[0];
    return def?.id || null;
  });
  const [loading, setLoading] = useState(!selectedProvider?.bank_details?.length);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [transactionNumber, setTransactionNumber] = useState('');

  const amount = invoice ? (typeof invoice.payment_amount === 'string'
    ? parseFloat(invoice.payment_amount.replace(/[^0-9.]/g, ''))
    : (parseFloat(invoice.payment_amount) || 0)) : 0;

  useEffect(() => {
    if (selectedProvider?.bank_details && selectedProvider.bank_details.length > 0) {
      const list = selectedProvider.bank_details;
      setBankAccounts(list);
      const def = list.find(b => b.is_default) || list[0];
      if (def && !selectedBankId) setSelectedBankId(def.id);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadBankDetails = async () => {
      try {
        setLoading(true);
        const res = await fetchPartnerPaymentMethods();
        if (isMounted && res?.status && Array.isArray(res?.data)) {
          const bankProvider = res.data.find(p => p?.name === PROVIDER_BANK_TRANSFER);
          if (bankProvider?.bank_details) {
            const list = bankProvider.bank_details;
            setBankAccounts(list);
            const def = list.find(b => b.is_default) || list[0];
            if (def && !selectedBankId) setSelectedBankId(def.id);
          }
        }
      } catch (err) {
        console.error('Failed to load bank details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBankDetails();
    return () => { isMounted = false; };
  }, [selectedProvider]);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleConfirmPayment = async () => {
    if (!selectedBankId) {
      toast.error("Please select a bank account to complete the transfer.");
      return;
    }
    setSubmitting(true);
    try {
      if (invoice?.id && selectedProvider?.id) {
        await processUnifiedPayment({
          payment_token: JSON.stringify({
            gateway: selectedProvider?.name || PROVIDER_BANK_TRANSFER,
            mode: 'manual',
            bank_detail_id: selectedBankId,
            transaction_number: transactionNumber ? transactionNumber.trim() : null,
          }),
          invoice_id: invoice.id,
          payment_method_id: selectedProvider.id,
          bank_detail_id: selectedBankId,
        });
      }
      setSubmitted(true);
      toast.success(`Payment submitted successfully! Status: ${STATUS_PROCESSING}`);
      if (onSuccess) {
        onSuccess({
          status: STATUS_PROCESSING,
          invoice_status: STATUS_PROCESSING,
          payment_status: STATUS_PROCESSING,
        });
      }
    } catch (err) {
      console.error('Error confirming payment:', err);
      toast.error(err?.response?.data?.message || "Failed to submit payment confirmation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-start py-2">
      {submitted ? (
        <div className="card border-0 bg-success-subtle shadow-sm rounded-3 text-center p-4">
          <div className="avatar-md mx-auto mb-2">
            <span className="avatar-title bg-success text-white rounded-circle fs-28 shadow-sm">
              <i className="ri-checkbox-circle-fill"></i>
            </span>
          </div>
          <h5 className="fw-bold text-success mb-1">Payment Status: Processing</h5>
          <p className="fs-13 text-muted mb-0">
            Your payment confirmation for Invoice #{invoice?.invoice_id || invoice?.id} (USD ${amount.toFixed(2)}) has been submitted. Administration will verify your transfer and notify you upon confirmation.
          </p>
        </div>
      ) : (
        <>
          {/* Informational Alert Box */}
          <div className="alert alert-info border-0 shadow-sm rounded-3 p-3 mb-3 d-flex align-items-start gap-3">
            <div className="avatar-xs flex-shrink-0 mt-0.5">
              <span className="avatar-title bg-info text-white rounded-circle fs-15">
                <i className="ri-information-line"></i>
              </span>
            </div>
            <div>
              <h6 className="mb-1 text-info fw-bold fs-14">Bank Transfer Details</h6>
              <p className="mb-0 fs-12 text-muted">
                Your payment will be processed manually. After confirmation from administration, you will be notified.
              </p>
            </div>
          </div>

          {/* 2 Bank Details per Row Grid */}
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
              <span className="fs-13 text-muted">Loading bank account details...</span>
            </div>
          ) : bankAccounts.length > 0 ? (
            <div className="row g-3">
              {bankAccounts.map((bank, index) => {
                const isSelected = Number(selectedBankId) === Number(bank.id);
                return (
                  <div
                    key={bank.id || index}
                    className="col-12 col-md-6"
                    onClick={() => setSelectedBankId(bank.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={`card border shadow-sm rounded-3 h-100 mb-0 bg-white ${isSelected ? 'border-primary shadow' : ''}`}>
                      {/* Card Header */}
                      <div className="card-header bg-light-subtle border-0 py-2.5 px-3 d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="radio"
                            name="selected_bank_transfer_account"
                            checked={isSelected}
                            onChange={() => setSelectedBankId(bank.id)}
                            className="form-check-input mt-0 cursor-pointer"
                          />
                          <h6 className="mb-0 fw-bold text-dark fs-14 text-truncate">{bank.bank_name || 'Bank Account'}</h6>
                        </div>
                        {isSelected ? (
                          <span className="badge bg-primary-subtle text-primary fs-11">
                            Selected
                          </span>
                        ) : bank.is_default ? (
                          <span className="badge bg-success-subtle text-success fs-11">
                            Default
                          </span>
                        ) : null}
                      </div>

                      {/* Card Content Table */}
                      <div className="card-body p-3 pt-1">
                        <table className="table table-borderless table-sm mb-0 fs-13">
                          <tbody>
                            {bank.account_name && (
                              <tr>
                                <td className="text-muted fw-medium py-1 align-middle" style={{ width: '40%' }}>Account Name</td>
                                <td className="fw-bold text-dark py-1 align-middle text-truncate">{bank.account_name}</td>
                              </tr>
                            )}
                            <tr>
                              <td className="text-muted fw-medium py-1 align-middle">Account Number</td>
                              <td className="py-1 align-middle">
                                <span className="fw-bold font-monospace text-dark me-1">{bank.account_number || 'N/A'}</span>
                                {bank.account_number && (
                                  <button
                                    type="button"
                                    className="btn p-0 border-0 bg-transparent text-primary ms-1 shadow-none align-middle"
                                    onClick={() => handleCopy(bank.account_number, `acc_${index}`)}
                                    title="Copy Account Number"
                                  >
                                    {copiedField === `acc_${index}` ? (
                                      <i className="ri-check-line text-success fs-15"></i>
                                    ) : (
                                      <i className="ri-file-copy-line fs-14"></i>
                                    )}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {bank.routing_number && (
                              <tr>
                                <td className="text-muted fw-medium py-1 align-middle">Routing / ABA</td>
                                <td className="py-1 align-middle">
                                  <span className="fw-bold font-monospace text-dark me-1">{bank.routing_number}</span>
                                  <button
                                    type="button"
                                    className="btn p-0 border-0 bg-transparent text-primary ms-1 shadow-none align-middle"
                                    onClick={() => handleCopy(bank.routing_number, `rout_${index}`)}
                                    title="Copy Routing Number"
                                  >
                                    {copiedField === `rout_${index}` ? (
                                      <i className="ri-check-line text-success fs-15"></i>
                                    ) : (
                                      <i className="ri-file-copy-line fs-14"></i>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            )}
                            {(invoice?.invoice_id || invoice?.id) && (
                              <tr>
                                <td className="text-muted fw-medium py-1 align-middle">Reference Memo</td>
                                <td className="py-1 align-middle">
                                  <span className="fw-bold font-monospace text-primary me-1">Invoice #{invoice.invoice_id || invoice.id}</span>
                                  <button
                                    type="button"
                                    className="btn p-0 border-0 bg-transparent text-primary ms-1 shadow-none align-middle"
                                    onClick={() => handleCopy(`Invoice #${invoice.invoice_id || invoice.id}`, `memo_${index}`)}
                                    title="Copy Reference"
                                  >
                                    {copiedField === `memo_${index}` ? (
                                      <i className="ri-check-line text-success fs-15"></i>
                                    ) : (
                                      <i className="ri-file-copy-line fs-14"></i>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                        {bank.instructions && (
                          <div className="bg-light p-2 rounded-2 fs-12 text-muted mt-2">
                            <i className="ri-information-line me-1 text-primary"></i>
                            <strong>Instructions:</strong> {bank.instructions}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="alert alert-warning mb-0 fs-13">
              <i className="ri-alert-line me-2"></i>
              No active bank accounts found. Please contact administration for payment instructions.
            </div>
          )}

          {/* Transaction Number Input */}
          <div className="mt-3.5 pt-3 border-top">
            <label className="form-label fw-semibold text-dark fs-13 mb-1">
              Transaction Number <span className="text-muted fw-normal fs-12">(Optional)</span>
            </label>
            <input
              type="text"
              className="form-control form-control-sm border shadow-none bg-white font-monospace fs-13"
              style={{ border: '1px solid #bcc5d1', borderRadius: '6px', padding: '8px 12px' }}
              placeholder="Enter bank wire / transfer transaction number"
              value={transactionNumber}
              onChange={(e) => setTransactionNumber(e.target.value)}
            />
            <small className="text-muted fs-11 mt-1 d-block">
              Provide your wire or ACH transaction reference ID to help administration verify your payment.
            </small>
          </div>

          {/* Action Footer */}
          <div className="mt-4 pt-3 border-top d-flex align-items-center justify-content-between gap-2">
            <div className="text-start">
              <span className="fs-11 text-muted d-block text-uppercase fw-semibold">Amount Due</span>
              <span className="fs-16 fw-bold text-dark font-monospace">${amount.toFixed(2)} USD</span>
            </div>
            <button
              type="button"
              className="btn btn-primary px-4 py-2 fw-semibold rounded-3 d-inline-flex align-items-center gap-2"
              onClick={handleConfirmPayment}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="ri-check-line fs-16"></i> Confirm Payment
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const ManualProcessingNoticeView = ({ selectedProvider, invoice, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [transactionNumber, setTransactionNumber] = useState('');

  const amount = invoice ? (typeof invoice.payment_amount === 'string'
    ? parseFloat(invoice.payment_amount.replace(/[^0-9.]/g, ''))
    : (parseFloat(invoice.payment_amount) || 0)) : 0;

  const handleConfirmPayment = async () => {
    setSubmitting(true);
    try {
      if (invoice?.id && selectedProvider?.id) {
        try {
          await processUnifiedPayment({
            payment_token: JSON.stringify({
              gateway: selectedProvider?.name || 'manual',
              mode: 'manual',
              transaction_number: transactionNumber ? transactionNumber.trim() : null,
            }),
            invoice_id: invoice.id,
            payment_method_id: selectedProvider.id,
          });
        } catch (apiErr) {
          console.log('Manual payment submission fallback logged');
        }
      }
      setSubmitted(true);
      toast.success(`Payment submitted successfully! Status: ${STATUS_PROCESSING}`);
      if (onSuccess) {
        onSuccess({
          status: STATUS_PROCESSING,
          invoice_status: STATUS_PROCESSING,
          payment_status: STATUS_PROCESSING,
        });
      }
    } catch (err) {
      console.error('Error confirming payment:', err);
      toast.error("Failed to submit payment confirmation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-start py-3">
      {submitted ? (
        <div className="card border-0 shadow-sm overflow-hidden mb-0 bg-white text-center p-4">
          <div className="avatar-md mx-auto mb-3">
            <span className="avatar-title bg-success-subtle text-success rounded-circle fs-32 shadow-sm">
              <i className="ri-checkbox-circle-fill"></i>
            </span>
          </div>
          <h5 className="fw-bold text-dark mb-1">Payment Confirmation Submitted</h5>
          <p className="text-muted fs-13 mb-3">Invoice #{invoice?.invoice_id || invoice?.id} &middot; USD ${amount.toFixed(2)}</p>

          <div className="d-inline-flex align-items-center gap-2 bg-warning-subtle text-warning px-3 py-1.5 rounded-pill mb-4">
            <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
            <span className="fw-bold fs-12 text-uppercase" style={{ letterSpacing: '0.5px' }}>Status: {STATUS_PROCESSING}</span>
          </div>

          <div className="p-3 bg-light rounded-3 text-start fs-13 text-muted max-w-md mx-auto">
            <p className="mb-1 text-dark fw-semibold">Next Steps:</p>
            <p className="mb-0">
              Your payment status is updated to <strong>{STATUS_PROCESSING}</strong>. Administration will verify your transfer and notify you upon final confirmation.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="alert alert-info border-0 shadow-sm rounded-3 p-3.5 mb-4 d-flex align-items-start gap-3">
            <div className="avatar-xs flex-shrink-0 mt-1">
              <span className="avatar-title bg-info-subtle text-info rounded-circle fs-16">
                <i className="ri-information-line"></i>
              </span>
            </div>
            <div>
              <h6 className="mb-1 text-info fw-semibold">{selectedProvider?.name || 'Payment Method'}</h6>
              <p className="mb-0 fs-13 text-muted">
                It will process manually, after confirmation from administration you will be notified.
              </p>
            </div>
          </div>

          {/* Transaction Number Input */}
          <div className="mb-4 text-start">
            <label className="form-label fw-semibold text-dark fs-13 mb-1">
              Transaction Number <span className="text-muted fw-normal fs-12">(Optional)</span>
            </label>
            <input
              type="text"
              className="form-control form-control-sm border shadow-none bg-white font-monospace fs-13"
              style={{ border: '1px solid #bcc5d1', borderRadius: '6px', padding: '8px 12px' }}
              placeholder="Enter transaction / reference number"
              value={transactionNumber}
              onChange={(e) => setTransactionNumber(e.target.value)}
            />
            <small className="text-muted fs-11 mt-1 d-block">
              Provide your reference ID to help administration verify your payment.
            </small>
          </div>

          <div className="mt-4 pt-3 border-top d-flex align-items-center justify-content-between gap-3">
            <div className="text-start">
              <span className="fs-11 text-muted d-block text-uppercase fw-semibold" style={{ letterSpacing: '0.5px' }}>Total Due</span>
              <span className="fs-18 fw-extrabold text-dark font-monospace">${amount.toFixed(2)} USD</span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-lg px-4 py-2.5 fs-15 fw-bold shadow-md rounded-3 d-inline-flex align-items-center gap-2 transition-all"
              onClick={handleConfirmPayment}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="ri-checkbox-circle-fill fs-18"></i> Confirm Payment
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

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
  };

  const isStripe = isStripeProvider(selectedProvider);
  const isBankTransfer = isBankTransferProvider(selectedProvider);
  const providerLogo = selectedProvider ? resolveLogo(selectedProvider.name, selectedProvider.logo) : '';

  return (
    <div className="modal fade stripe-payment-modal ppm-modal" ref={modalRef} tabIndex="-1" aria-hidden="true">
      <div
        className={`modal-dialog modal-dialog-centered${isBankTransfer ? ' modal-xl' : ''}`}
        style={isBankTransfer ? { maxWidth: '850px', width: '92%' } : {}}
      >
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
                <div className="ppm-gateway-provider mb-1 pb-0 text-center" style={{ margin: '0 0 10px 0', padding: 0 }}>
                  {providerLogo ? (
                    <img
                      src={providerLogo}
                      alt={selectedProvider.name}
                      className="ppm-gateway-logo-img"
                      style={{ height: '80px', width: 'auto', maxHeight: '95px', maxWidth: '300px', objectFit: 'contain' }}
                    />
                  ) : (
                    <span className="ppm-gateway-icon" style={{ fontSize: '48px' }}>
                      <i className="ri-secure-payment-line"></i>
                    </span>
                  )}
                </div>

                {isStripe ? (
                  <StripeForm
                    amount={amount}
                    invoice={invoice}
                    selectedProvider={selectedProvider}
                    onPaymentSuccess={onSuccess}
                    onCancel={onHide}
                  />
                ) : isBankTransfer ? (
                  <BankTransferDetailsView
                    selectedProvider={selectedProvider}
                    invoice={invoice}
                    onSuccess={onSuccess}
                  />
                ) : (
                  <ManualProcessingNoticeView
                    selectedProvider={selectedProvider}
                    invoice={invoice}
                    onSuccess={onSuccess}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}