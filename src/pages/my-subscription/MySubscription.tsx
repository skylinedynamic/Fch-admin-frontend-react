import React, { useEffect, useState, useRef, type JSX } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '../../lib/stripe';
import { Skeleton } from 'primereact/skeleton';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { toast } from 'react-toastify';
import ConfirmationModal from '../../components/Common/Modals/ConfirmationModal';
import MySubscriptionLoader from '../../components/Loader/MySubscriptionLoader';
import {
  fetchMySubscriptionDetails,
  fetchMySubscriptionPaymentProviders,
  updateMySubscriptionDefaultPaymentMethod,
  cancelMySubscription,
  removeMySubscriptionDefaultPaymentMethod,
} from '../../modules/my-subscription/services';
import {
  STATUS_ACTIVE as SUBSCRIPTION_STATUS_ACTIVE,
  STATUS_EXPIRED as SUBSCRIPTION_STATUS_EXPIRED,
  STATUS_COMPLETED as SUBSCRIPTION_STATUS_COMPLETED,
  STATUS_CANCELLED as SUBSCRIPTION_STATUS_CANCELLED,
  STATUS_PENDING as SUBSCRIPTION_STATUS_PENDING,
  ENROLLMENT_TYPE_ONE_TIME,
} from '../../config/subscriptionConfig';
import {
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_PROCESSING,
  PAYMENT_STATUS_SUCCEEDED,
  PAYMENT_STATUS_FAILED,
  PAYMENT_STATUS_REJECTED,
  PROVIDER_STRIPE,
  PROVIDER_BANK_TRANSFER,
  TRANSACTION_TYPE_DEBIT,
  TRANSACTION_TYPE_CREDIT,
} from '../../config/paymentConfig';
import {
  STATUS_SUCCESS as INVOICE_STATUS_SUCCESS,
} from '../../config/invoiceConfig';

export interface PaymentProviderItem {
  id: number | string;
  name: string;
  display_name?: string;
  slug?: string;
  logo?: string | null;
  publishable_key?: string | null;
  status?: boolean | number | string;
}

export interface PaymentHistoryItem {
  id?: number | string;
  created_at?: string;
  transaction_date?: string;
  invoice_no?: string;
  invoice_id?: string;
  invoice?: { invoice_id?: string };
  payment_method?: string;
  from?: string;
  displayable_amount?: string;
  amount?: string;
  transaction_type?: string;
  status?: string;
}

export interface MySubscriptionData {
  recent_bill?: {
    id?: number | string;
    amount?: string;
    invoice_id?: string;
    created_at?: string;
    status?: string;
  } | null;
  upcoming_billing?: {
    amount?: string;
    next_date?: string;
    type?: string;
    enrollment_type?: string;
    current_phase?: string;
    status?: string;
  } | null;
  subscription?: {
    enrollment_type?: string;
    installment_count?: number;
    installments_paid?: number;
    status?: string;
    is_completed?: boolean;
    enrollment_completed_at?: string;
    payable_amount?: string;
    subscription_amount_per_month?: string;
    /** The recurring platform fee - distinct from subscription_amount_per_month,
     *  which is the installment/enrollment amount and is null once enrollment
     *  is complete. */
    monthly_platform_fee?: string;
    subscription_start_date?: string;
    subscription_end_date?: string;
  } | null;
  partner?: {
    default_payment_method?: string;
    payment_provider?: {
      name?: string;
      logo?: string | null;
    } | null;
    stripe_card_info?: {
      name?: string;
      card_no?: string;
      customer_id?: string;
    } | null;
    stripe_customer_id?: string | object | null;
  } | null;
  recent_payments?: PaymentHistoryItem[];
}

const isOneTimeType = (type?: string | null, count?: number | null): boolean => {
  if (!type) return true;
  const t = type.toLowerCase();
  return t.includes('one time') || (count !== undefined && count !== null && Number(count) <= 1);
};

// Stripe Card Input Form component for card authorization
interface StripeCardInputFormProps {
  selectedProvider: PaymentProviderItem;
  submitting: boolean;
  setSubmitting: (val: boolean) => void;
  onSuccess: () => void;
  onCancel: () => void;
}

const StripeCardInputForm: React.FC<StripeCardInputFormProps> = ({
  selectedProvider,
  submitting,
  setSubmitting,
  onSuccess,
  onCancel,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not loaded');
      }

      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        setErrorMsg(error.message || 'Failed to authorize card');
        setSubmitting(false);
        return;
      }

      await updateMySubscriptionDefaultPaymentMethod({
        provider_name: selectedProvider.name,
        payment_method_id: paymentMethod.id,
      });

      toast.success('Payment method updated successfully');
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || 'Failed to update payment method.');
    } finally {
      setSubmitting(false);
    }
  };

  const CARD_ELEMENT_OPTIONS = {
    style: {
      base: {
        color: '#1e293b',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '15px',
        '::placeholder': {
          color: '#94a3b8',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit}>
      {errorMsg && (
        <div className="alert alert-danger fs-12 py-2 mb-3 rounded-1" role="alert">
          {errorMsg}
        </div>
      )}
      <div className="mb-4">
        <label className="form-label fs-13 fw-semibold text-dark mb-2">Card Details</label>
        <div className="p-3 border rounded-1 bg-white shadow-sm">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>
      <div className="d-flex justify-content-end gap-2 pt-2">
        <button type="button" className="btn btn-light py-2 px-4 fw-medium" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary py-2 px-4 fw-bold" disabled={!stripe || submitting}>
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span> Saving...
            </>
          ) : (
            'Save New Card & Set Default'
          )}
        </button>
      </div>
    </form>
  );
};

// Modal Component for Changing Payment Method
interface ChangePaymentMethodModalProps {
  show: boolean;
  currentMethod?: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

const ChangePaymentMethodModal: React.FC<ChangePaymentMethodModalProps> = ({
  show,
  currentMethod,
  onClose,
  onUpdated,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const modalInstanceRef = useRef<any>(null);

  const [providers, setProviders] = useState<PaymentProviderItem[]>([]);
  const [loadingProviders, setLoadingProviders] = useState<boolean>(true);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const isStripeSelected =
    (selectedProvider?.name || '').toLowerCase() === PROVIDER_STRIPE.toLowerCase() ||
    (selectedProvider?.display_name || '').toLowerCase() === PROVIDER_STRIPE.toLowerCase() ||
    (selectedProvider?.slug || '').toLowerCase() === PROVIDER_STRIPE.toLowerCase();

  useEffect(() => {
    if (modalRef.current && (window as any).bootstrap) {
      modalInstanceRef.current = new (window as any).bootstrap.Modal(modalRef.current, {
        backdrop: 'static',
        keyboard: false,
      });

      const handleHidden = () => {
        onClose();
      };

      const currentModalRef = modalRef.current;
      currentModalRef?.addEventListener('hidden.bs.modal', handleHidden);

      return () => {
        currentModalRef?.removeEventListener('hidden.bs.modal', handleHidden);
      };
    }
  }, []);

  useEffect(() => {
    const modal = modalInstanceRef.current;
    if (!modal) return;

    if (show) {
      modal.show();
      loadProviders();
    } else {
      modal.hide();
    }
  }, [show]);

  useEffect(() => {
    return () => {
      const modal = modalInstanceRef.current;
      if (modal) {
        try {
          modal.hide();
          if (typeof modal.dispose === 'function') modal.dispose();
        } catch (_) { }
      }
      modalInstanceRef.current = null;
      document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
      document.body.classList.remove('modal-open');
    };
  }, []);

  useEffect(() => {
    if (show && selectedProvider && isStripeSelected) {
      initStripe(selectedProvider.publishable_key || undefined);
    }
  }, [show, selectedProvider, isStripeSelected]);

  const initStripe = async (pubKey?: string) => {
    try {
      const promise = await getStripe(pubKey);
      setStripePromise(promise);
    } catch (e) {
      console.error('Failed to init stripe', e);
    }
  };

  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const res = await fetchMySubscriptionPaymentProviders();
      const rawList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const list = rawList.filter((p: PaymentProviderItem) => Boolean(p.status) === true);
      setProviders(list);
      if (list.length > 0) {
        const matching = list.find(
          (p: PaymentProviderItem) =>
            (p.name || '').toLowerCase() === (currentMethod || '').toLowerCase() ||
            (p.display_name || '').toLowerCase() === (currentMethod || '').toLowerCase()
        );
        setSelectedProvider(matching || list[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch payment providers:', err);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleClose = () => {
    onClose();
    const modal = modalInstanceRef.current;
    if (modal) {
      modal.hide();
    }
  };

  const handleNonStripeSave = async () => {
    if (!selectedProvider) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateMySubscriptionDefaultPaymentMethod({
        provider_name: selectedProvider.name,
      });
      toast.success('Payment method updated successfully');
      handleClose();
      onUpdated();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update payment method.');
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="modal fade flip"
      ref={modalRef}
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg rounded-1 overflow-hidden">
          <div className="modal-header bg-light px-4 py-3 border-bottom">
            <div className="d-flex align-items-center gap-2">
              <div className="avatar-xs flex-shrink-0">
                <span className="avatar-title bg-primary-subtle text-primary rounded-circle fs-16">
                  <i className="ri-bank-card-line"></i>
                </span>
              </div>
              <div>
                <h5 className="modal-title fs-16 fw-bold mb-0 text-dark">Change Default Payment Method</h5>
                <span className="text-muted fs-12">Select your preferred payment gateway</span>
              </div>
            </div>
            <button type="button" className="btn-close" onClick={handleClose} disabled={submitting}></button>
          </div>
          <div className="modal-body p-4">
            {error && (
              <div className="alert alert-danger fs-13 py-2 px-3 mb-3 rounded-1 d-flex align-items-center gap-2" role="alert">
                <i className="ri-error-warning-line fs-16"></i>
                <span>{error}</span>
              </div>
            )}

            {loadingProviders ? (
              <div className="row g-3 mb-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="col-12 col-sm-6 col-md-4">
                    <div className="card border rounded-1 p-3 text-center h-100 mb-0 shadow-sm bg-white provider-card-box">
                      <div className="card-body p-3 d-flex flex-column align-items-center justify-content-center">
                        <Skeleton width="110px" height="50px" className="mb-2 rounded-1" />
                        <Skeleton width="60%" height="1rem" className="mb-0" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <label className="form-label fs-13 fw-semibold text-dark mb-3">Available Payment Gateways</label>
                <div className="row g-3 mb-4">
                  {providers.map((p) => {
                    const isSelected = selectedProvider?.id === p.id;
                    return (
                      <div key={p.id} className="col-12 col-sm-6 col-md-4">
                        <div
                          className={`card cursor-pointer h-100 mb-0 transition-all position-relative rounded-1 provider-card-box ${isSelected ? 'border-2 border-primary bg-primary-subtle shadow-sm' : 'border bg-white hover-shadow'
                            }`}
                          onClick={() => setSelectedProvider(p)}
                        >
                          {isSelected && (
                            <div className="position-absolute top-0 end-0 m-2">
                              <span className="badge bg-primary rounded-circle p-1 d-inline-flex align-items-center justify-content-center">
                                <i className="ri-check-line text-white fs-12"></i>
                              </span>
                            </div>
                          )}
                          <div className="card-body p-3 text-center d-flex flex-column align-items-center justify-content-center">
                            <div className="provider-card-logo-container mb-2">
                              {p.logo ? (
                                <img src={p.logo} alt={p.display_name || p.name} className="img-fluid provider-card-logo-img" />
                              ) : (
                                <div className="avatar-md">
                                  <span className="avatar-title bg-light text-primary rounded-circle fs-24">
                                    <i className="ri-bank-card-line"></i>
                                  </span>
                                </div>
                              )}
                            </div>
                            <h6 className="fs-13 fw-semibold mb-0 text-dark">{p.display_name || p.name}</h6>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedProvider && (
                  <div className="border-top pt-4">
                    {isStripeSelected ? (
                      <div>
                        <div className="alert alert-info fs-12 mb-3 rounded-1 d-flex align-items-center gap-2">
                          <i className="ri-information-line fs-16 flex-shrink-0"></i>
                          <span>Enter your card details below to set Stripe as your primary payment method.</span>
                        </div>
                        {stripePromise ? (
                          <Elements stripe={stripePromise}>
                            <StripeCardInputForm
                              selectedProvider={selectedProvider}
                              submitting={submitting}
                              setSubmitting={setSubmitting}
                              onSuccess={() => {
                                handleClose();
                                onUpdated();
                              }}
                              onCancel={handleClose}
                            />
                          </Elements>
                        ) : (
                          <Skeleton height="80px" />
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="alert alert-secondary fs-13 mb-4 rounded-1 d-flex align-items-center gap-2">
                          <i className="ri-checkbox-circle-line fs-16 text-success flex-shrink-0"></i>
                          <span>
                            Selecting <strong>{selectedProvider.display_name || selectedProvider.name}</strong> will set it as your primary default payment method.
                          </span>
                        </div>
                        <div className="d-flex justify-content-end gap-2">
                          <button type="button" className="btn btn-light py-2 px-4 fw-medium" onClick={handleClose} disabled={submitting}>
                            Cancel
                          </button>
                          <button type="button" className="btn btn-primary py-2 px-4 fw-bold" onClick={handleNonStripeSave} disabled={submitting}>
                            {submitting ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1" role="status"></span> Updating...
                              </>
                            ) : (
                              'Set as Default Method'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// Main Partner My Subscription Page
export default function MySubscription(): JSX.Element {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<MySubscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChangeModal, setShowChangeModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [showRemoveModal, setShowRemoveModal] = useState<boolean>(false);
  const [removing, setRemoving] = useState<boolean>(false);

  const handleRemoveDefaultPaymentMethod = async () => {
    setRemoving(true);
    try {
      const res = await removeMySubscriptionDefaultPaymentMethod();
      toast.success(res?.message || 'Default payment method removed');
      setShowRemoveModal(false);
      loadSubscriptionDetails(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove the default payment method.');
    } finally {
      setRemoving(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await cancelMySubscription();
      toast.success('Subscription cancelled successfully');
      setShowCancelModal(false);
      loadSubscriptionDetails(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    loadSubscriptionDetails();
  }, []);

  const loadSubscriptionDetails = async (showLoadingSpinner: boolean = true) => {
    if (showLoadingSpinner) setLoading(true);
    setError(null);
    try {
      const res = await fetchMySubscriptionDetails();
      setData(res?.data || res);
    } catch (err: any) {
      console.error('Failed to load my subscription details:', err);
      setError(err?.response?.data?.message || 'Failed to fetch subscription details.');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  const recentBill = data?.recent_bill;
  const upcoming = data?.upcoming_billing;
  const subscription = data?.subscription;
  const partner = data?.partner;
  const recentPayments = data?.recent_payments || [];
  // None once removed; the API still answers Stripe for a card saved before defaults were recorded.
  const hasDefaultMethod = Boolean(partner?.payment_provider?.name || partner?.default_payment_method);

  const isSubscriptionCancelled = (subscription?.status || '').toLowerCase() === SUBSCRIPTION_STATUS_CANCELLED.toLowerCase();
  const subHasCompletedDate = Boolean(subscription?.enrollment_completed_at);
  const subInstallmentsPaid = Number(subscription?.installments_paid || 0);
  const subInstallmentCount = Number(subscription?.installment_count || 0);
  const subIsOneTime = isOneTimeType(subscription?.enrollment_type, subscription?.installment_count);

  const isSubscriptionCompleted = Boolean(
    subscription?.is_completed ||
    (subIsOneTime ? subHasCompletedDate : subHasCompletedDate && subInstallmentCount > 0 && subInstallmentsPaid >= subInstallmentCount) ||
    [SUBSCRIPTION_STATUS_COMPLETED.toLowerCase(), SUBSCRIPTION_STATUS_EXPIRED.toLowerCase()].includes((subscription?.status || '').toLowerCase())
  );

  const formatDateOnly = (dateStr?: string): string => {
    if (!dateStr) return '-';
    try {
      return dateStr.split(' ')[0];
    } catch {
      return dateStr;
    }
  };

  const methodBodyTemplate = (rowData: PaymentHistoryItem): JSX.Element => {
    const method = rowData.payment_method || rowData.from || PROVIDER_BANK_TRANSFER;
    return <span className="fw-semibold text-dark fs-13">{method}</span>;
  };

  const amountBodyTemplate = (rowData: PaymentHistoryItem): JSX.Element => {
    const amt = rowData.displayable_amount || rowData.amount || '-';
    return <span className="fw-bold text-dark fs-13">{amt}</span>;
  };

  const typeBodyTemplate = (rowData: PaymentHistoryItem): JSX.Element => {
    const type = rowData.transaction_type || TRANSACTION_TYPE_DEBIT;
    const isCredit = (type || '').toUpperCase() === TRANSACTION_TYPE_CREDIT.toUpperCase();
    return (
      <span className={`badge ${isCredit ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} text-uppercase px-2 py-1 fs-11 fw-semibold`}>
        {type}
      </span>
    );
  };

  const statusBodyTemplate = (rowData: PaymentHistoryItem): JSX.Element => {
    const status = (rowData.status || 'N/A').toUpperCase();
    const isSuccess = [
      PAYMENT_STATUS_SUCCEEDED.toUpperCase(),
      PAYMENT_STATUS_PAID.toUpperCase(),
      INVOICE_STATUS_SUCCESS.toUpperCase(),
    ].includes(status);
    const isFailed = [
      PAYMENT_STATUS_REJECTED.toUpperCase(),
      PAYMENT_STATUS_FAILED.toUpperCase(),
      SUBSCRIPTION_STATUS_CANCELLED.toUpperCase(),
    ].includes(status);
    return (
      <span className={`badge ${isSuccess ? 'bg-success-subtle text-success' : isFailed ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning'} text-uppercase px-2 py-1 fs-11 fw-semibold`}>
        {status}
      </span>
    );
  };

  return (
    <div className="page-content">
      <div className="container-fluid">
        {/* Header with Breadcrumb */}
        <div className="row pb-1 mobile-sticky-header">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between flex-row py-2">
              <div className="flex-grow-1">
                <h4 className="fs-20 mb-1">My Subscription</h4>
                <nav aria-label="breadcrumb">
                  <ol className="breadcrumb m-0 fs-12 text-muted">
                    <li className="breadcrumb-item">
                      <Link to="/" className="text-muted">Dashboard</Link>
                    </li>
                    <li className="breadcrumb-item active text-primary font-weight-bold" aria-current="page">
                      My Subscription
                    </li>
                  </ol>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <i className="ri-error-warning-line me-2 align-middle fs-16"></i>
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}

        {loading ? (
          <MySubscriptionLoader />
        ) : (
          <>
            {/* Top Metric Cards */}
            <div className="row g-3 mb-3">
              {/* 1. Recent / Current Bill */}
              <div className="col-xl-4 col-md-6 col-12">
                <div className="card billing-card-wrapper h-100 mb-0">
                  <div className="card-body p-3 d-flex flex-column">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div className="billing-card-icon-avatar bg-primary-subtle text-primary">
                          <i className="ri-file-list-3-line"></i>
                        </div>
                        <div>
                          <h6 className="fs-12 text-uppercase text-muted fw-bold mb-0">Current / Recent Bill</h6>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {recentBill && (
                          <span
                            className={`badge billing-card-badge-pill ${(recentBill.status || '').toUpperCase() === PAYMENT_STATUS_PAID.toUpperCase()
                              ? 'bg-success-subtle text-success border border-success-subtle'
                              : (recentBill.status || '').toUpperCase() === PAYMENT_STATUS_PROCESSING.toUpperCase()
                                ? 'bg-warning-subtle text-warning border border-warning-subtle'
                                : 'bg-danger-subtle text-danger border border-danger-subtle'
                              }`}
                          >
                            {recentBill.status}
                          </span>
                        )}
                        {recentBill && (
                          <Link to={`/invoices/${recentBill.id}`} className="btn btn-sm btn-soft-primary px-2.5 py-1 fs-12 fw-semibold d-inline-flex align-items-center gap-1">
                            <i className="ri-eye-line"></i> View Invoice
                          </Link>
                        )}
                      </div>
                    </div>

                    {recentBill ? (
                      <div className="my-1">
                        <h3 className="billing-card-amount fs-20 mb-1">{recentBill.amount}</h3>
                        <div className="d-flex flex-column gap-1 fs-12 text-muted">
                          <div>
                            <i className="ri-hashtag text-primary me-1"></i>
                            <span>Invoice #: <strong>{recentBill.invoice_id}</strong></span>
                          </div>
                          <div>
                            <i className="ri-calendar-event-line text-primary me-1"></i>
                            <span>Date: <strong>{recentBill.created_at || 'N/A'}</strong></span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted fs-13 mb-0 my-auto">No recent bill found.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Upcoming Billing */}
              <div className="col-xl-4 col-md-6 col-12">
                <div className="card billing-card-wrapper h-100 mb-0">
                  <div className="card-body p-3 d-flex flex-column">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div className="billing-card-icon-avatar bg-info-subtle text-info">
                          <i className="ri-calendar-todo-line"></i>
                        </div>
                        <div>
                          <h6 className="fs-12 text-uppercase text-muted fw-bold mb-0">Upcoming Billing</h6>
                        </div>
                      </div>
                      <span className="badge bg-info-subtle text-info border border-info-subtle">
                        {upcoming?.status || SUBSCRIPTION_STATUS_ACTIVE}
                      </span>
                    </div>

                    {upcoming ? (
                      <div className="my-1">
                        <h3 className="billing-card-amount fs-20 mb-1">{upcoming.amount}</h3>
                        <div className="d-flex flex-column gap-1 fs-12 text-muted">
                          <div>
                            <i className="ri-calendar-event-line text-info me-1"></i>
                            <span>Next Date: <strong>{upcoming.next_date || 'N/A'}</strong></span>
                          </div>
                          <div>
                            <i className="ri-shield-user-line text-info me-1"></i>
                            <span>Phase: <strong>{upcoming.current_phase || 'N/A'}</strong></span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted fs-13 mb-0 my-auto">No upcoming billing details.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Default Payment Method */}
              <div className="col-xl-4 col-md-12 col-12">
                <div className="card billing-card-wrapper h-100 mb-0">
                  <div className="card-body p-3 d-flex flex-column">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div className="billing-card-icon-avatar bg-warning-subtle text-warning">
                          <i className="ri-wallet-3-line"></i>
                        </div>
                        <div>
                          <h6 className="fs-12 text-uppercase text-muted fw-bold mb-0">
                            Default Payment Gateway
                          </h6>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        {hasDefaultMethod && (
                          <button
                            type="button"
                            className="btn btn-sm btn-soft-danger px-2.5 py-1 fs-12 fw-medium rounded-1"
                            onClick={() => setShowRemoveModal(true)}
                          >
                            <i className="ri-delete-bin-line me-1"></i> Remove
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-soft-primary px-2.5 py-1 fs-12 fw-medium rounded-1"
                          onClick={() => setShowChangeModal(true)}
                        >
                          <i className="ri-edit-line me-1"></i> Change
                        </button>
                      </div>
                    </div>

                    {!hasDefaultMethod ? (
                      <div className="d-flex align-items-center gap-3 pt-2">
                        <div className="billing-card-icon-avatar bg-light text-muted">
                          <i className="ri-bank-card-2-line"></i>
                        </div>
                        <div>
                          <h6 className="fs-14 fw-bold text-dark mb-1">No default payment method</h6>
                          <span className="text-muted fs-12 d-block">Invoices are not charged automatically until you set one.</span>
                        </div>
                      </div>
                    ) : (
                    <div className="d-flex align-items-center gap-3 pt-2">
                      {partner?.payment_provider?.logo ? (
                        <div className="billing-card-logo-box">
                          <img
                            src={partner.payment_provider.logo}
                            alt={partner.payment_provider.name || 'Gateway'}
                            className="billing-card-logo-img"
                          />
                        </div>
                      ) : (
                        <div className="billing-card-icon-avatar bg-light text-warning">
                          <i className="ri-bank-card-2-line"></i>
                        </div>
                      )}
                      <div>
                        <h6 className="fs-14 fw-bold text-dark mb-1">
                          {partner?.payment_provider?.name || partner?.default_payment_method || PROVIDER_STRIPE}
                        </h6>
                        {(() => {
                          const providerName = partner?.payment_provider?.name || partner?.default_payment_method || PROVIDER_STRIPE;
                          const isStripe = providerName.toLowerCase() === PROVIDER_STRIPE.toLowerCase();
                          const cardInfo = partner?.stripe_card_info || (typeof partner?.stripe_customer_id === 'object' ? (partner?.stripe_customer_id as any) : null);
                          const hasCustomer = Boolean(cardInfo?.customer_id || partner?.stripe_customer_id);
                          const cardHolderName = cardInfo?.name || (hasCustomer || isStripe ? 'Sandbox Card' : null);
                          const cardNumber = cardInfo?.card_no;

                          if (isStripe && (cardHolderName || cardNumber)) {
                            return (
                              <div className="fs-12 text-muted">
                                {cardHolderName && (
                                  <div className="d-flex align-items-center mb-0.5">
                                    <i className="ri-user-line me-1 text-primary"></i>
                                    <span className="fw-medium text-dark">{cardHolderName}</span>
                                  </div>
                                )}
                                {cardNumber && (
                                  <div className="d-flex align-items-center">
                                    <i className="ri-bank-card-line me-1 text-primary"></i>
                                    <span className="fw-medium text-dark">{cardNumber}</span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return <span className="text-muted fs-12 d-block">Primary payment gateway</span>;
                        })()}
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Subscription & Plan Details Card */}
            <div className="row mb-3">
              <div className="col-12">
                <div className="card billing-card-wrapper mb-0">
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar-md">
                          <span className="avatar-title bg-primary-subtle text-primary rounded-circle fs-24">
                            <i className="ri-vip-crown-2-line"></i>
                          </span>
                        </div>
                        <div>
                          <h5 className="fs-16 fw-bold text-dark mb-1">
                            Active Subscription Plan: {subscription?.enrollment_type || ENROLLMENT_TYPE_ONE_TIME}
                          </h5>
                          <span className="text-muted fs-13">Manage your partner subscription and payment breakdown</span>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {!isSubscriptionCompleted && !isSubscriptionCancelled && subscription && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger px-2.5 py-1 fs-12 fw-medium rounded-1 d-inline-flex align-items-center gap-1"
                            onClick={() => setShowCancelModal(true)}
                          >
                            <i className="ri-close-circle-line"></i> Cancel Subscription
                          </button>
                        )}
                        <span
                          className={`badge billing-card-badge-pill ${isSubscriptionCompleted
                              ? 'bg-success-subtle text-success border border-success-subtle'
                              : isSubscriptionCancelled
                                ? 'bg-danger-subtle text-danger border border-danger-subtle'
                                : 'bg-info-subtle text-info border border-info-subtle'
                            }`}
                        >
                          {isSubscriptionCompleted ? SUBSCRIPTION_STATUS_COMPLETED : subscription?.status || SUBSCRIPTION_STATUS_ACTIVE}
                        </span>
                      </div>
                    </div>

                    <div className="row g-3 fs-13">
                      <div className="col-xl-3 col-md-6 col-12">
                        <span className="text-muted d-block fs-12">Total Plan Amount</span>
                        <strong className="text-dark fs-14">{subscription?.payable_amount || 'N/A'}</strong>
                      </div>
                      <div className="col-xl-3 col-md-6 col-12">
                        <span className="text-muted d-block fs-12">Monthly Platform Fee</span>
                        <strong className="text-dark fs-14">{subscription?.monthly_platform_fee || 'N/A'}</strong>
                      </div>
                      <div className="col-xl-3 col-md-6 col-12">
                        <span className="text-muted d-block fs-12">Start Date</span>
                        <strong className="text-dark fs-14">{subscription?.subscription_start_date || 'N/A'}</strong>
                      </div>
                      <div className="col-xl-3 col-md-6 col-12">
                        <span className="text-muted d-block fs-12">Next Billing Date</span>
                        <strong className="text-info fs-14">{upcoming?.next_date || subscription?.subscription_end_date || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Payments History Table */}
            <div className="row">
              <div className="col-12">
                <div className="card shadow-sm border-0 mb-4">
                  <div className="card-header bg-white border-0 py-3 px-4 d-flex align-items-center justify-content-between">
                    <h5 className="card-title fs-15 fw-bold mb-0 text-dark">Recent Payments History</h5>
                    <Link to="/payments" className="fs-12 text-primary fw-medium text-decoration-none d-inline-flex align-items-center gap-1">
                      View All Payments &rarr;
                    </Link>
                  </div>
                  <div className="card-body p-0">
                    <DataTable value={recentPayments} className="p-datatable-sm" emptyMessage="No payment history found">
                      <Column field="created_at" header="DATE" body={(r: PaymentHistoryItem) => formatDateOnly(r.created_at || r.transaction_date)} className="col-w-130" />
                      <Column field="invoice_no" header="INVOICE #" body={(r: PaymentHistoryItem) => r.invoice_no || r.invoice_id || r.invoice?.invoice_id || '-'} className="col-w-160" />
                      <Column field="payment_method" header="PAYMENT METHOD" body={methodBodyTemplate} className="col-w-160" />
                      <Column field="amount" header="AMOUNT" body={amountBodyTemplate} className="col-w-130" />
                      <Column field="transaction_type" header="TYPE" body={typeBodyTemplate} className="col-w-110" />
                      <Column field="status" header="STATUS" body={statusBodyTemplate} className="col-w-130" />
                    </DataTable>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modals */}
        <ChangePaymentMethodModal
          show={showChangeModal}
          currentMethod={partner?.default_payment_method}
          onClose={() => setShowChangeModal(false)}
          onUpdated={() => loadSubscriptionDetails(false)}
        />

        {/* Remove Default Payment Method Confirmation Modal */}
        <ConfirmationModal
          show={showRemoveModal}
          onHide={() => setShowRemoveModal(false)}
          onConfirm={handleRemoveDefaultPaymentMethod}
          loading={removing}
          title="Remove Default Payment Method"
          message="Your invoices will not be charged automatically until you set a default payment method again - you will need to pay them manually. Payments already made are not affected."
          confirmText="Yes, Remove It"
          cancelText="Keep It"
          variant="danger"
        />

        {/* Cancel Subscription Confirmation Modal */}
        <ConfirmationModal
          show={showCancelModal}
          onHide={() => setShowCancelModal(false)}
          onConfirm={handleCancelSubscription}
          loading={cancelling}
          title="Cancel Subscription"
          message="Are you sure you want to cancel your partner subscription? Once cancelled, your automatic recurring billing will stop and your subscription status will be marked as Cancelled."
          confirmText="Yes, Cancel Subscription"
          cancelText="Keep Subscription"
          variant="danger"
        />
      </div>
    </div>
  );
}
