import React, { useState, useEffect } from 'react';
import { processUnifiedPayment } from '../../../modules/invoice/services';
import { toast } from 'react-toastify';
import { getStripe } from '../../../lib/stripe';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

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
        payment_token: JSON.stringify({
          gateway: 'authorize_net',
          cardNumber: cardNumber.replace(/\s/g, ''),
          expMonth,
          expYear,
          cardCode,
        }),
        invoice_id: invoice.id,
        payment_method_id: selectedProvider.id,
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
        payment_token: JSON.stringify({
          gateway: 'square',
          cardNumber: cardNumber.replace(/\s/g, ''),
          expiry,
          cvv,
          postalCode,
        }),
        invoice_id: invoice.id,
        payment_method_id: selectedProvider.id,
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
        payment_token: JSON.stringify({
          gateway: 'ecrypt',
          cardNumber: cardNumber.replace(/\s/g, ''),
          expiry,
          cvv,
        }),
        invoice_id: invoice.id,
        payment_method_id: selectedProvider.id,
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

/* ── Stripe form ── */

export const StripeForm = ({ amount, invoice, selectedProvider, onPaymentSuccess, onCancel }) => {
  const [stripePromise, setStripePromise] = useState(null);

  useEffect(() => {
    if (selectedProvider?.publishable_key) {
      getStripe(selectedProvider.publishable_key).then(setStripePromise);
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

const StripeCardFormInner = ({ amount, invoice, selectedProvider, onPaymentSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;

    setProcessing(true);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not loaded');
      }

      // 1. Create Payment Method securely using Stripe CardElement
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        toast.error(error.message || 'Failed to authorize card details');
        setProcessing(false);
        return;
      }

      // 2. Send the Stripe Payment Method ID (pm_xxxxx) to the backend
      const response = await processUnifiedPayment({
        payment_token: paymentMethod.id, // Direct pm_xxxx token
        invoice_id: invoice.id,
        payment_method_id: selectedProvider.id,
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
      toast.error(err.response?.data?.message || err.message || 'Failed to process payment');
      onCancel();
    } finally {
      setProcessing(false);
    }
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
        disabled={!isValid || processing}
        processing={processing}
        onClick={handlePay}
      />
    </div>
  );
};