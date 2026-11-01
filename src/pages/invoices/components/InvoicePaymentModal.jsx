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

const BankDetailsSkeleton = () => (
  <div className="bank-skeleton-container" aria-busy="true" aria-live="polite">
    {/* Informational Alert Box Skeleton */}
    <div className="alert alert-info border-0 shadow-sm rounded-1 p-3 mb-3 d-flex align-items-start gap-3">
      <div className="avatar-xs flex-shrink-0 mt-0.5">
        <span className="avatar-title bg-info text-white rounded-circle fs-15">
          <i className="ri-information-line"></i>
        </span>
      </div>
      <div className="flex-grow-1">
        <div className="bank-skeleton-pulse bank-skeleton-alert-title mb-2"></div>
        <div className="bank-skeleton-pulse bank-skeleton-alert-text"></div>
      </div>
    </div>

    {/* 2 Bank Cards Skeleton Grid */}
    <div className="row g-3">
      {[1, 2].map((item) => (
        <div key={item} className="col-12 col-md-6">
          <div className="bank-skeleton-card">
            {/* Card Header Skeleton */}
            <div className="bank-skeleton-card-header">
              <div className="d-flex align-items-center gap-2">
                <div className="bank-skeleton-pulse bank-skeleton-radio"></div>
                <div className="bank-skeleton-pulse bank-skeleton-title"></div>
              </div>
              <div className="bank-skeleton-pulse bank-skeleton-badge"></div>
            </div>

            {/* Card Body Rows Skeleton */}
            <div className="bank-skeleton-card-body">
              <div className="bank-skeleton-row">
                <div className="bank-skeleton-pulse bank-skeleton-label"></div>
                <div className="bank-skeleton-pulse bank-skeleton-value"></div>
              </div>
              <div className="bank-skeleton-row">
                <div className="bank-skeleton-pulse bank-skeleton-label"></div>
                <div className="bank-skeleton-pulse bank-skeleton-value"></div>
              </div>
              <div className="bank-skeleton-row">
                <div className="bank-skeleton-pulse bank-skeleton-label"></div>
                <div className="bank-skeleton-pulse bank-skeleton-value"></div>
              </div>
              <div className="bank-skeleton-row">
                <div className="bank-skeleton-pulse bank-skeleton-label"></div>
                <div className="bank-skeleton-pulse bank-skeleton-value"></div>
              </div>
              <div className="bank-skeleton-pulse bank-skeleton-instruction"></div>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Transaction Number Skeleton */}
    <div className="mt-3.5 pt-3 border-top">
      <div className="bank-skeleton-pulse bank-skeleton-input-label"></div>
      <div className="bank-skeleton-pulse bank-skeleton-input-box"></div>
      <div className="bank-skeleton-pulse bank-skeleton-input-help"></div>
    </div>

    {/* Action Footer Skeleton */}
    <div className="mt-4 pt-3 border-top d-flex align-items-center justify-content-between gap-2">
      <div>
        <div className="bank-skeleton-pulse bank-skeleton-footer-amount-label"></div>
        <div className="bank-skeleton-pulse bank-skeleton-footer-amount-value"></div>
      </div>
      <div className="bank-skeleton-pulse bank-skeleton-footer-btn"></div>
    </div>
  </div>
);

const PaymentConfirmationReceiptView = ({ invoice, selectedProvider, transactionNumber, amount, onHide }) => (
  <div className="ppm-view-fade-in py-1">
    <div className="fintech-receipt-card mb-0">
      {/* Header Banner */}
      <div className="fintech-receipt-header">
        <div className="fintech-success-icon-wrap">
          <i className="ri-checkbox-circle-fill"></i>
        </div>
        <div className="mb-2">
          <span className="badge bg-success-subtle text-success fs-12 px-3 py-1.5 rounded-pill fw-semibold">
            <i className="ri-check-double-line me-1 align-middle"></i> Payment Submitted Successfully
          </span>
        </div>
        <div className="fintech-receipt-amount">
          ${amount.toFixed(2)}<span className="currency">USD</span>
        </div>
        <div className="fs-13 text-muted">
          Payment confirmation received for Invoice #{invoice?.invoice_id || invoice?.id}
        </div>
      </div>

      {/* Body Details */}
      <div className="fintech-receipt-body">
        {/* Receipt Details Table */}
        <table className="fintech-receipt-table mb-3">
          <tbody>
            <tr>
              <td className="label-col">Invoice Number</td>
              <td className="value-col font-monospace">#{invoice?.invoice_id || invoice?.id}</td>
            </tr>
            <tr>
              <td className="label-col">Payment Method</td>
              <td className="value-col text-primary">{selectedProvider?.name || 'Bank Transfer'}</td>
            </tr>
            {transactionNumber && (
              <tr>
                <td className="label-col">Reference ID</td>
                <td className="value-col font-monospace text-dark">{transactionNumber}</td>
              </tr>
            )}
            <tr>
              <td className="label-col">Verification Status</td>
              <td className="value-col">
                <span className="badge bg-warning-subtle text-warning-emphasis fs-11 px-2.5 py-1 rounded fw-semibold">
                  <i className="ri-hourglass-fill me-1 align-middle"></i>Under Review
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Process Timeline */}
        <div className="fintech-timeline">
          <div className="fintech-step completed">
            <div className="fintech-step-icon">
              <i className="ri-check-line"></i>
            </div>
            <div className="fintech-step-label">Submitted</div>
          </div>
          <div className="fintech-step active">
            <div className="fintech-step-icon">
              <i className="ri-loader-4-line"></i>
            </div>
            <div className="fintech-step-label">Review</div>
          </div>
          <div className="fintech-step">
            <div className="fintech-step-icon">
              <i className="ri-shield-check-line"></i>
            </div>
            <div className="fintech-step-label">Account Active</div>
          </div>
        </div>

        {/* Notice Box */}
        <div className="fintech-notice-box">
          <div>
            Administration is reviewing your payment. You will receive an email confirmation once verified and approved.
          </div>
        </div>
      </div>
    </div>

    {/* Modal Action Footer */}
    <div className="mt-4 pt-3 border-top d-flex align-items-center justify-content-end">
      <button
        type="button"
        className="btn btn-primary px-4 py-2 fw-semibold rounded-1 d-inline-flex align-items-center gap-2 shadow-sm"
        onClick={onHide}
      >
        <i className="ri-close-line fs-16"></i> Close
      </button>
    </div>
  </div>
);

const BankTransferDetailsView = ({ selectedProvider, invoice, onSuccess, onHide, onSubmittedChange }) => {
  const [bankAccounts, setBankAccounts] = useState(selectedProvider?.bank_details || []);
  const [selectedBankId, setSelectedBankId] = useState(() => {
    const list = selectedProvider?.bank_details || [];
    const def = list.find(b => b.is_default) || list[0];
    return def?.id || null;
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [transactionNumber, setTransactionNumber] = useState('');

  const amount = invoice ? (typeof invoice.payment_amount === 'string'
    ? parseFloat(invoice.payment_amount.replace(/[^0-9.]/g, ''))
    : (parseFloat(invoice.payment_amount) || 0)) : 0;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (selectedProvider?.bank_details && selectedProvider.bank_details.length > 0) {
      const list = selectedProvider.bank_details;
      setBankAccounts(list);
      const def = list.find(b => b.is_default) || list[0];
      if (def && !selectedBankId) setSelectedBankId(def.id);

      const timer = setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 400);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    const loadBankDetails = async () => {
      try {
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
        if (isMounted) {
          setTimeout(() => {
            if (isMounted) setLoading(false);
          }, 300);
        }
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
      if (onSubmittedChange) onSubmittedChange(true);
      if (onSuccess) {
        onSuccess({
          status: STATUS_PROCESSING,
          invoice_status: STATUS_PROCESSING,
          payment_status: STATUS_PROCESSING,
          isManual: true,
          invoice: invoice,
          provider: selectedProvider?.name || 'Bank Transfer',
        });
      }
    } catch (err) {
      console.error('Error confirming payment:', err);
      toast.error(err?.response?.data?.message || "Failed to submit payment confirmation");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <PaymentConfirmationReceiptView
        invoice={invoice}
        selectedProvider={selectedProvider}
        transactionNumber={transactionNumber}
        amount={amount}
        onHide={onHide}
      />
    );
  }

  return (
    <div className="text-start py-2">
      {loading ? (
        <BankDetailsSkeleton />
      ) : (
        <div className="ppm-view-fade-in">
          {/* Informational Alert Box */}
          <div className="alert alert-info border-0 shadow-sm rounded-1 p-3 mb-3 d-flex align-items-start gap-3">
            <div className="avatar-xs flex-shrink-0 mt-0.5">
              <span className="avatar-title bg-info text-white rounded-circle fs-15">
                <i className="ri-information-line"></i>
              </span>
            </div>
            <div>
              <h6 className="mb-1 text-info fw-bold fs-14">Bank Transfer Details</h6>
              <p className="mb-0 fs-12 text-muted">
                Transfer funds directly to one of the bank accounts below, then click Confirm Payment.
              </p>
            </div>
          </div>

          {/* 2 Bank Details per Row Grid */}
          {bankAccounts.length > 0 ? (
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
                    <div className={`card bank-card-item h-100 mb-0 ${isSelected ? 'bank-card-selected' : ''}`}>
                      {/* Card Header */}
                      <div className="card-header border-0 py-2.5 px-3 d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="radio"
                            name="selected_partner_bank_account"
                            checked={isSelected}
                            onChange={() => setSelectedBankId(bank.id)}
                            className="form-check-input mt-0 cursor-pointer"
                          />
                          <h6 className="mb-0 fw-bold text-dark fs-14 text-truncate">{bank.bank_name || 'Bank Account'}</h6>
                        </div>
                        {isSelected ? (
                          <span className="badge bg-primary-subtle text-primary fs-11">
                            <i className="ri-check-line me-1"></i>Selected
                          </span>
                        ) : bank.is_default ? (
                          <span className="badge bg-success-subtle text-success fs-11">
                            Default
                          </span>
                        ) : null}
                      </div>

                      {/* Card Content Table */}
                      <div className="card-body p-3 pt-2">
                        <table className="table table-borderless table-sm mb-0 fs-13">
                          <tbody>
                            {bank.account_name && (
                              <tr>
                                <td className="text-muted fw-medium py-1.5 align-middle col-w-40">
                                  Account Name
                                </td>
                                <td className="py-1.5 align-middle">
                                  <span className="fw-bold text-dark me-1">{bank.account_name}</span>
                                  <button
                                    type="button"
                                    className="bank-copy-btn shadow-none align-middle"
                                    onClick={() => handleCopy(bank.account_name, `name_${index}`)}
                                    title="Copy Account Name"
                                  >
                                    {copiedField === `name_${index}` ? (
                                      <i className="ri-check-line text-success fs-14"></i>
                                    ) : (
                                      <i className="ri-file-copy-line fs-13"></i>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            )}
                            <tr>
                              <td className="text-muted fw-medium py-1.5 align-middle">
                                Account Number
                              </td>
                              <td className="py-1.5 align-middle">
                                <span className="fw-bold font-monospace text-dark me-1">{bank.account_number || 'N/A'}</span>
                                {bank.account_number && (
                                  <button
                                    type="button"
                                    className="bank-copy-btn shadow-none align-middle"
                                    onClick={() => handleCopy(bank.account_number, `acc_${index}`)}
                                    title="Copy Account Number"
                                  >
                                    {copiedField === `acc_${index}` ? (
                                      <i className="ri-check-line text-success fs-14"></i>
                                    ) : (
                                      <i className="ri-file-copy-line fs-13"></i>
                                    )}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {bank.routing_number && (
                              <tr>
                                <td className="text-muted fw-medium py-1.5 align-middle">
                                  Routing / ABA
                                </td>
                                <td className="py-1.5 align-middle">
                                  <span className="fw-bold font-monospace text-dark me-1">{bank.routing_number}</span>
                                  <button
                                    type="button"
                                    className="bank-copy-btn shadow-none align-middle"
                                    onClick={() => handleCopy(bank.routing_number, `rout_${index}`)}
                                    title="Copy Routing Number"
                                  >
                                    {copiedField === `rout_${index}` ? (
                                      <i className="ri-check-line text-success fs-14"></i>
                                    ) : (
                                      <i className="ri-file-copy-line fs-13"></i>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            )}
                            {(invoice?.invoice_id || invoice?.id) && (
                              <tr>
                                <td className="text-muted fw-medium py-1.5 align-middle">
                                  Reference Memo
                                </td>
                                <td className="py-1.5 align-middle">
                                  <span className="bank-memo-pill font-monospace fw-bold me-1">{invoice.invoice_id || invoice.id}</span>
                                  <button
                                    type="button"
                                    className="bank-copy-btn shadow-none align-middle"
                                    onClick={() => handleCopy(`${invoice.invoice_id || invoice.id}`, `memo_${index}`)}
                                    title="Copy Reference Memo"
                                  >
                                    {copiedField === `memo_${index}` ? (
                                      <i className="ri-check-line text-success fs-14"></i>
                                    ) : (
                                      <i className="ri-file-copy-line fs-13"></i>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                        {bank.instructions && (
                          <div className="bank-instruction-alert fs-12 text-muted mt-2.5 d-flex align-items-start justify-content-between gap-2">
                            <div>
                              <strong>Instructions:</strong> {bank.instructions}
                            </div>
                            <button
                              type="button"
                              className="bank-copy-btn shadow-none flex-shrink-0"
                              onClick={() => handleCopy(bank.instructions, `inst_${index}`)}
                              title="Copy Instructions"
                            >
                              {copiedField === `inst_${index}` ? (
                                <i className="ri-check-line text-success fs-14"></i>
                              ) : (
                                <i className="ri-file-copy-line fs-13"></i>
                              )}
                            </button>
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
              No active bank accounts found. Please contact administration for payment instructions.
            </div>
          )}

          {/* Transaction Number Input */}
          <div className="mt-3.5 pt-3 border-top">
            <label className="form-label fw-semibold text-dark fs-13 mb-1">
              Transaction Number <span className="text-muted fw-normal fs-12">(Optional)</span>
            </label>
            <div className="transaction-input-group">
              <span className="input-group-text">
                <i className="ri-file-text-line"></i>
              </span>
              <input
                type="text"
                className="form-control form-control-sm bg-white font-monospace fs-13"
                placeholder="Enter wire or transfer reference number"
                value={transactionNumber}
                onChange={(e) => setTransactionNumber(e.target.value)}
              />
            </div>
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
              className="btn btn-primary px-4 py-2 fw-semibold rounded-1 d-inline-flex align-items-center gap-2 shadow-sm"
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
        </div>
      )}
    </div>
  );
};

const ManualProcessingNoticeView = ({ selectedProvider, invoice, onSuccess, onHide, onSubmittedChange }) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [transactionNumber, setTransactionNumber] = useState('');

  const amount = invoice ? (typeof invoice.payment_amount === 'string'
    ? parseFloat(invoice.payment_amount.replace(/[^0-9.]/g, ''))
    : (parseFloat(invoice.payment_amount) || 0)) : 0;

  const handleConfirmPayment = async () => {
    setSubmitting(true);
    try {
      // A refusal from the API has to stop here: this used to be caught and
      // logged, so a rejected payment still showed the confirmation receipt.
      if (invoice?.id && selectedProvider?.id) {
        await processUnifiedPayment({
          payment_token: JSON.stringify({
            gateway: selectedProvider?.name || 'manual',
            mode: 'manual',
            transaction_number: transactionNumber ? transactionNumber.trim() : null,
          }),
          invoice_id: invoice.id,
          payment_method_id: selectedProvider.id,
        });
      }
      setSubmitted(true);
      if (onSubmittedChange) onSubmittedChange(true);
      if (onSuccess) {
        onSuccess({
          status: STATUS_PROCESSING,
          invoice_status: STATUS_PROCESSING,
          payment_status: STATUS_PROCESSING,
          isManual: true,
          invoice: invoice,
          provider: selectedProvider?.name || 'Manual Payment',
        });
      }
    } catch (err) {
      console.error('Error confirming payment:', err);
      toast.error(err?.response?.data?.message || "Failed to submit payment confirmation");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <PaymentConfirmationReceiptView
        invoice={invoice}
        selectedProvider={selectedProvider}
        transactionNumber={transactionNumber}
        amount={amount}
        onHide={onHide}
      />
    );
  }

  return (
    <div className="text-start py-3">
      <div className="alert alert-info border-0 shadow-sm rounded-1 p-3.5 mb-4 d-flex align-items-start gap-3">
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
        <div className="transaction-input-group">
          <span className="input-group-text">
            <i className="ri-file-text-line"></i>
          </span>
          <input
            type="text"
            className="form-control form-control-sm bg-white font-monospace fs-13"
            placeholder="Enter transaction / reference number"
            value={transactionNumber}
            onChange={(e) => setTransactionNumber(e.target.value)}
          />
        </div>
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
          className="btn btn-primary btn-lg px-4 py-2.5 fs-15 fw-bold shadow-md rounded-1 d-inline-flex align-items-center gap-2 transition-all"
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
    </div>
  );
};

export default function InvoicePaymentModal({ show, onHide, onSuccess, invoice }) {
  const modalRef = useRef(null);
  const modalInstanceRef = useRef(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
      setIsSubmitted(false);
    }
  }, [show]);

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setIsSubmitted(false);
  };

  const handleBackToProviders = () => {
    setSelectedProvider(null);
    setIsSubmitted(false);
  };

  const isStripe = isStripeProvider(selectedProvider);
  const isBankTransfer = isBankTransferProvider(selectedProvider);
  const providerLogo = selectedProvider ? resolveLogo(selectedProvider.name, selectedProvider.logo) : '';

  return (
    <div className="modal fade stripe-payment-modal ppm-modal flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
      <div
        className={`modal-dialog modal-dialog-centered${isBankTransfer ? ' modal-xl ppm-bank-transfer-dialog' : ''}`}
      >
        <div className="modal-content ppm-content">
          {/* Nothing mounts until the modal is opened. Pages keep this modal in
              the tree beside the invoice preview and hand it the same invoice,
              so mounting the provider selector while hidden fetched the payment
              methods - and, with Stripe as the only one, loaded Stripe.js - on
              every preview. */}
          {!show ? null : !selectedProvider ? (
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
                {isSubmitted ? (
                  <div className="d-flex align-items-center gap-3">
                    <div className="avatar-sm flex-shrink-0">
                      <div className="avatar-title bg-success-subtle text-success rounded fs-20 payment-method-avatar-title">
                        <i className="ri-checkbox-circle-fill"></i>
                      </div>
                    </div>
                    <div>
                      <h5 className="mb-0 fs-15 fw-semibold text-dark">Payment Confirmation</h5>
                      <p className="text-muted mb-0 fs-12">
                        Invoice #{invoice?.invoice_id} &middot; USD ${amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ) : (
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
                )}
                <button type="button" className="btn-close" onClick={onHide}></button>
              </div>

              <div className="ppm-card-body">
                {!isSubmitted && (
                  <div className="ppm-gateway-provider mb-2 pb-0 text-center">
                    {providerLogo ? (
                      <img
                        src={providerLogo}
                        alt={selectedProvider.name}
                        className="ppm-gateway-logo-img"
                      />
                    ) : (
                      <span className="ppm-gateway-icon ppm-gateway-icon-large">
                        <i className="ri-secure-payment-line"></i>
                      </span>
                    )}
                  </div>
                )}

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
                    onHide={onHide}
                    onSubmittedChange={setIsSubmitted}
                  />
                ) : (
                  <ManualProcessingNoticeView
                    selectedProvider={selectedProvider}
                    invoice={invoice}
                    onSuccess={onSuccess}
                    onHide={onHide}
                    onSubmittedChange={setIsSubmitted}
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