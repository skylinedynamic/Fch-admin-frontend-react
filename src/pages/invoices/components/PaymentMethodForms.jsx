import React, { useState } from 'react';
import { processUnifiedPayment } from '../../../modules/invoice/services';
import { toast } from 'react-toastify';

/* ── Card input formatting helpers ── */

const formatCardNumber = (val) => {
  const digits = val.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};

const formatExpiry = (val) => {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
};

const formatCVV = (val) => val.replace(/\D/g, '').slice(0, 4);

const formatPostal = (val) => val.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 10);

/* ── Summary + Pay button (shared) ── */

const PaymentSummary = ({ amount }) => (
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

const PayButton = ({ amount, providerName, disabled, onClick, processing }) => (
  <div className="hstack gap-2 justify-content-center">
    <button
      type="button"
      className="stripe-submit-btn"
      disabled={disabled || processing}
      onClick={onClick}
    >
      {processing ? (
        <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Processing...</>
      ) : (
        <><i className="ri-shield-check-line me-1"></i> Pay ${amount.toFixed(2)}</>
      )}
    </button>
  </div>
);

/* ── Stripe-style card input field ── */

const CardField = ({ label, value, onChange, placeholder, maxLength, inputMode }) => (
  <div>
    <label className="stripe-field-label">{label}</label>
    <input
      type="text"
      className="card-detail-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode || 'numeric'}
      autoComplete="off"
    />
  </div>
);

/* ── Authorize.net form ── */

export const AuthorizeNetForm = ({ amount, invoice, selectedProvider, onPaymentSuccess, onCancel }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [processing, setProcessing] = useState(false);

  const isValid = cardNumber.replace(/\s/g, '').length >= 15 && expMonth.length === 2 && expYear.length === 2 && cardCode.length >= 3;

  const handlePay = async () => {
    setProcessing(true);
    try {
      const response = await processUnifiedPayment({
        provider_id: selectedProvider.id,
        invoice_id: invoice.id,
        payment_method_id: JSON.stringify({
          gateway: 'authorize_net',
          cardNumber: cardNumber.replace(/\s/g, ''),
          expMonth,
          expYear,
          cardCode,
        }),
      });

      if (response.status) {
        toast.success('Payment completed successfully!');
        onPaymentSuccess(response.data?.id || response.data?.payment_id);
        window.location.reload();
      } else {
        toast.error(response.message || 'Payment failed');
        onCancel();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process payment');
      onCancel();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="card-detail-form">
      <CardField
        label="Card Number"
        value={cardNumber}
        onChange={(v) => setCardNumber(formatCardNumber(v))}
        placeholder="0000 0000 0000 0000"
        maxLength={23}
      />
      <div className="card-detail-row">
        <CardField
          label="Exp Month"
          value={expMonth}
          onChange={(v) => setExpMonth(v.replace(/\D/g, '').slice(0, 2))}
          placeholder="MM"
          maxLength={2}
        />
        <CardField
          label="Exp Year"
          value={expYear}
          onChange={(v) => setExpYear(v.replace(/\D/g, '').slice(0, 2))}
          placeholder="YY"
          maxLength={2}
        />
        <CardField
          label="CVV"
          value={cardCode}
          onChange={(v) => setCardCode(formatCVV(v))}
          placeholder="123"
          maxLength={4}
        />
      </div>
      <PaymentSummary amount={amount} />
      <PayButton
        amount={amount}
        disabled={!isValid}
        processing={processing}
        onClick={handlePay}
      />
    </div>
  );
};

/* ── Square form ── */

export const SquareForm = ({ amount, invoice, selectedProvider, onPaymentSuccess, onCancel }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [processing, setProcessing] = useState(false);

  const isValid = cardNumber.replace(/\s/g, '').length >= 15 && expiry.length === 5 && cvv.length >= 3 && postalCode.length >= 3;

  const handlePay = async () => {
    setProcessing(true);
    try {
      const response = await processUnifiedPayment({
        provider_id: selectedProvider.id,
        invoice_id: invoice.id,
        payment_method_id: JSON.stringify({
          gateway: 'square',
          cardNumber: cardNumber.replace(/\s/g, ''),
          expiry,
          cvv,
          postalCode,
        }),
      });

      if (response.status) {
        toast.success('Payment completed successfully!');
        onPaymentSuccess(response.data?.id || response.data?.payment_id);
        window.location.reload();
      } else {
        toast.error(response.message || 'Payment failed');
        onCancel();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process payment');
      onCancel();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="card-detail-form">
      <CardField
        label="Card Number"
        value={cardNumber}
        onChange={(v) => setCardNumber(formatCardNumber(v))}
        placeholder="0000 0000 0000 0000"
        maxLength={23}
      />
      <div className="card-detail-row">
        <CardField
          label="Expiry"
          value={expiry}
          onChange={(v) => setExpiry(formatExpiry(v))}
          placeholder="MM/YY"
          maxLength={5}
        />
        <CardField
          label="CVV"
          value={cvv}
          onChange={(v) => setCvv(formatCVV(v))}
          placeholder="123"
          maxLength={4}
        />
        <CardField
          label="Postal Code"
          value={postalCode}
          onChange={(v) => setPostalCode(formatPostal(v))}
          placeholder="ZIP"
          maxLength={10}
          inputMode="text"
        />
      </div>
      <PaymentSummary amount={amount} />
      <PayButton
        amount={amount}
        disabled={!isValid}
        processing={processing}
        onClick={handlePay}
      />
    </div>
  );
};

/* ── Ecrypt form ── */

export const EcryptForm = ({ amount, invoice, selectedProvider, onPaymentSuccess, onCancel }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [processing, setProcessing] = useState(false);

  const isValid = cardNumber.replace(/\s/g, '').length >= 15 && expiry.length === 5 && cvv.length >= 3;

  const handlePay = async () => {
    setProcessing(true);
    try {
      const response = await processUnifiedPayment({
        provider_id: selectedProvider.id,
        invoice_id: invoice.id,
        payment_method_id: JSON.stringify({
          gateway: 'ecrypt',
          cardNumber: cardNumber.replace(/\s/g, ''),
          expiry,
          cvv,
        }),
      });

      if (response.status) {
        toast.success('Payment completed successfully!');
        onPaymentSuccess(response.data?.id || response.data?.payment_id);
        window.location.reload();
      } else {
        toast.error(response.message || 'Payment failed');
        onCancel();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process payment');
      onCancel();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="card-detail-form">
      <CardField
        label="Card Number"
        value={cardNumber}
        onChange={(v) => setCardNumber(formatCardNumber(v))}
        placeholder="0000 0000 0000 0000"
        maxLength={23}
      />
      <div className="card-detail-row">
        <CardField
          label="Expiry"
          value={expiry}
          onChange={(v) => setExpiry(formatExpiry(v))}
          placeholder="MM/YY"
          maxLength={5}
        />
        <CardField
          label="CVV"
          value={cvv}
          onChange={(v) => setCvv(formatCVV(v))}
          placeholder="123"
          maxLength={4}
        />
      </div>
      <PaymentSummary amount={amount} />
      <PayButton
        amount={amount}
        disabled={!isValid}
        processing={processing}
        onClick={handlePay}
      />
    </div>
  );
};