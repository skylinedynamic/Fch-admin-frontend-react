import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Modal from 'bootstrap/js/dist/modal';
import { fetchPaymentById, approvePayment, rejectPayment } from '../../modules/payment/services';
import { toast } from 'react-toastify';
import {
    PAYMENT_STATUS_COLORS,
    PAYMENT_ENVIRONMENT_COLORS,
    PAYMENT_ENVIRONMENT_LABELS,
    TRANSACTION_TYPE_DEBIT,
    TRANSACTION_TYPE_CREDIT,
    PAYMENT_STATUS_SUCCEEDED,
    PAYMENT_STATUS_REJECTED,
    PAYMENT_STATUS_FAILED,
    PAYMENT_STATUS_PAID,
    PROVIDER_STRIPE
} from '../../config/paymentConfig';
import { ENTITY_TYPE_PARTNER, ENTITY_TYPE_BORROWER } from '../../config/appConfig';
import DetailsSkeletonLoader from '../../components/Loader/DetailsSkeletonLoader';
import { formatDate } from '../../utils/formatters';
import ErrorPage from '../Utility/ErrorPage';

export default function PaymentDetails() {
    const { id } = useParams();
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);

    // Approval / Rejection state
    const [note, setNote] = useState('');
    const [noteError, setNoteError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    // Bootstrap Modal Refs
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);
    const rejectModalRef = useRef(null);
    const rejectModalInstanceRef = useRef(null);

    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }
    }, [payment]);

    useEffect(() => {
        if (!rejectModalRef.current) return;
        if (!rejectModalInstanceRef.current) {
            rejectModalInstanceRef.current = new Modal(rejectModalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }
    }, [payment]);

    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (showConfirmModal) {
            modal.show();
        } else {
            modal.hide();
        }
    }, [showConfirmModal]);

    useEffect(() => {
        const modal = rejectModalInstanceRef.current;
        if (!modal) return;
        if (showRejectModal) {
            modal.show();
        } else {
            modal.hide();
        }
    }, [showRejectModal]);

    useEffect(() => {
        return () => {
            if (modalInstanceRef.current) {
                try {
                    modalInstanceRef.current.hide();
                    if (typeof modalInstanceRef.current.dispose === 'function') {
                        modalInstanceRef.current.dispose();
                    }
                } catch (_) { }
                modalInstanceRef.current = null;
            }
            if (rejectModalInstanceRef.current) {
                try {
                    rejectModalInstanceRef.current.hide();
                    if (typeof rejectModalInstanceRef.current.dispose === 'function') {
                        rejectModalInstanceRef.current.dispose();
                    }
                } catch (_) { }
                rejectModalInstanceRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const getDetails = async () => {
            try {
                const response = await fetchPaymentById(id);
                if (response.status || response.data) {
                    setPayment(response.data || response);
                } else if (response.transaction_id) {
                    setPayment(response);
                } else {
                    toast.error('Failed to load payment details');
                }
            } catch (error) {
                console.error('Error fetching payment details:', error);
                toast.error('Error loading payment details');
            } finally {
                setLoading(false);
            }
        };
        getDetails();
    }, [id]);

    const handleApproveClick = () => {
        setNoteError('');
        setShowConfirmModal(true);
    };

    const handleConfirmApprove = async () => {
        try {
            setApproving(true);
            const response = await approvePayment(id, { note: note.trim() });
            if (response.status || response.data) {
                toast.success(response.message || 'Payment approved successfully!');
                setPayment(response.data || response);
                setShowConfirmModal(false);
            } else {
                toast.error(response.message || 'Failed to approve payment.');
            }
        } catch (error) {
            console.error('Error approving payment:', error);
            toast.error(error.response?.data?.message || 'Error approving payment');
        } finally {
            setApproving(false);
        }
    };

    const handleRejectClick = () => {
        if (!note.trim()) {
            setNoteError('Note / Rejection reason is required for rejection.');
            return;
        }
        setNoteError('');
        setShowRejectModal(true);
    };

    const handleConfirmReject = async () => {
        try {
            setRejecting(true);
            const response = await rejectPayment(id, { reason: note.trim(), note: note.trim() });
            if (response.status || response.data) {
                toast.success(response.message || 'Payment rejected successfully. Invoice is now Unpaid.');
                setPayment(response.data || response);
                setShowRejectModal(false);
            } else {
                toast.error(response.message || 'Failed to reject payment.');
            }
        } catch (error) {
            console.error('Error rejecting payment:', error);
            toast.error(error.response?.data?.message || 'Error rejecting payment');
        } finally {
            setRejecting(false);
        }
    };

    if (!loading && !payment) {
        return <ErrorPage status={404} title="Payment Not Found" message="The payment you are looking for does not exist or you do not have permission to view it." />;
    }

    const status = payment?.status?.toLowerCase();
    const statusColor = PAYMENT_STATUS_COLORS[status] || 'primary';
    const envVal = payment?.is_environment ? 1 : 0;
    const envColor = PAYMENT_ENVIRONMENT_COLORS[envVal] || 'info';
    const envLabel = PAYMENT_ENVIRONMENT_LABELS[envVal];
    const payerType = payment?.entity_type?.includes(ENTITY_TYPE_PARTNER) ? ENTITY_TYPE_PARTNER : payment?.entity_type?.includes(ENTITY_TYPE_BORROWER) ? ENTITY_TYPE_BORROWER : 'Customer';
    const paymentMethod = payment?.from || payment?.payment_method || payment?.payment_provider || '';
    const isStripe = String(paymentMethod) == String(PROVIDER_STRIPE);
    const rawDetails = payment?.raw_details || (typeof payment?.details === 'object' ? payment?.details : null);
    const hasRawDetails = rawDetails && (typeof rawDetails === 'object' ? Object.keys(rawDetails).length > 0 : String(rawDetails).trim() !== '');

    const rejectionRemarks = payment?.rejection_reason
        || payment?.details?.rejection_reason
        || (typeof rawDetails === 'object' ? (rawDetails?.rejection_reason || rawDetails?.reason) : null);

    const approvalRemarks = payment?.note
        || payment?.details?.approval_note
        || (typeof rawDetails === 'object' ? (rawDetails?.approval_note || (rawDetails?.decision === 'approved' ? rawDetails?.note : null)) : null);

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header */}
                <div className="row">
                    <div className="col-12 d-flex justify-content-between align-items-center py-2">
                        <div>
                            <h4 className="fs-20 mb-1">Payment Details</h4>
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb m-0 fs-12 text-muted">
                                    <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                    <li className="breadcrumb-item"><Link to="/payments" className="text-muted">Payments</Link></li>
                                    <li className="breadcrumb-item active text-primary fw-medium" aria-current="page">Details</li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <DetailsSkeletonLoader />
                ) : (
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="card border-0 overflow-hidden shadow-sm mb-4">
                                <div className="card-header bg-soft-primary border-bottom border-primary border-opacity-25 p-4">
                                    <div className="d-flex align-items-center">
                                        <div className="flex-shrink-0 avatar-sm">
                                            <div className="avatar-title bg-primary bg-opacity-10 text-primary rounded fs-24">
                                                <i className="ri-secure-payment-line"></i>
                                            </div>
                                        </div>
                                        <div className="flex-grow-1 ms-3">
                                            <h4 className="card-title text-primary mb-1 fs-18">
                                                Invoice: {payment.invoice_id ? (
                                                    <Link to={`/invoices/${payment.invoice_id}`} className="text-primary text-decoration-underline">
                                                        {payment.invoice_id}
                                                    </Link>
                                                ) : '-'}
                                            </h4>
                                            <p className="text-muted mb-0 fs-13">Date: {payment.transaction_date ? formatDate(payment.transaction_date) : (payment.created_at ? formatDate(payment.created_at) : '-')}</p>
                                        </div>
                                        <div className="flex-shrink-0 text-end">
                                            <h2 className="text-primary mb-1">{payment.amount || '-'}</h2>
                                            <span className={`badge bg-${statusColor} fs-12 text-uppercase`}>{payment.status}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-body p-4">
                                    {approvalRemarks && (
                                        <div className="alert alert-success bg-success-subtle text-success border-0 p-3 mb-4 rounded">
                                            <div className="d-flex align-items-center mb-1">
                                                <i className="ri-checkbox-circle-fill fs-18 me-2 text-success"></i>
                                                <span className="fw-semibold fs-14">Approval Remarks:</span>
                                            </div>
                                            <p className="mb-0 fs-13 ps-4 text-dark fw-medium">{approvalRemarks}</p>
                                        </div>
                                    )}

                                    {rejectionRemarks && (
                                        <div className="alert alert-danger bg-danger-subtle text-danger border-0 p-3 mb-4 rounded">
                                            <div className="d-flex align-items-center mb-1">
                                                <i className="ri-close-circle-fill fs-18 me-2 text-danger"></i>
                                                <span className="fw-semibold fs-14">Rejection Remarks:</span>
                                            </div>
                                            <p className="mb-0 fs-13 ps-4 text-dark fw-medium">{rejectionRemarks}</p>
                                        </div>
                                    )}

                                    <h5 className="fs-15 fw-bold mb-3 border-bottom pb-2">Payment Details</h5>
                                    <div className="row mb-4">
                                        <div className="col-lg-3 col-sm-6 mb-3">
                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Payment Method</p>
                                            <h5 className="fs-14 mb-0">{payment.from || payment.payment_method || '-'}</h5>
                                        </div>
                                        <div className="col-lg-3 col-sm-6 mb-3">
                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Payment Type</p>
                                            <h5 className="fs-14 mb-0">{payment.payment_type || '-'}</h5>
                                        </div>
                                        <div className="col-lg-3 col-sm-6 mb-3">
                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Transaction Type</p>
                                            {(() => {
                                                const type = payment.transaction_type || (payment.is_partner_paying ? TRANSACTION_TYPE_DEBIT : TRANSACTION_TYPE_CREDIT);
                                                const isDebit = String(type).toLowerCase() === TRANSACTION_TYPE_DEBIT.toLowerCase();
                                                return (
                                                    <span className={`badge bg-${isDebit ? 'danger-subtle text-danger' : 'success-subtle text-success'} text-uppercase fw-semibold fs-12`}>
                                                        {type}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <div className="col-lg-3 col-sm-6 mb-3">
                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Environment</p>
                                            <span className={`badge bg-${envColor} text-uppercase`}>{envLabel}</span>
                                        </div>
                                        <div className="col-lg-3 col-sm-6 mb-3">
                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Transaction ID</p>
                                            <h5 className="fs-14 mb-0">{payment.transaction_id || '-'}</h5>
                                        </div>
                                    </div>

                                    <h5 className="fs-15 fw-bold mb-3 border-bottom pb-2">Payer Information</h5>
                                    <div className="row bg-light rounded p-3 m-0 mb-4">
                                        <div className="col-lg-3 col-sm-6 mb-3 mb-lg-0">
                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Entity Type</p>
                                            <h5 className="fs-14 mb-0"><span className="badge bg-secondary-subtle text-secondary px-2 py-1">{payerType}</span></h5>
                                        </div>
                                        <div className="col-lg-3 col-sm-6 mb-3 mb-lg-0">
                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Name</p>
                                            <h5 className="fs-14 mb-0">{payment.partner_name || payment.borrower_name || payment.name || '-'}</h5>
                                        </div>
                                        <div className="col-lg-3 col-sm-6 mb-3 mb-lg-0">
                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Email</p>
                                            <h5 className="fs-14 mb-0">{payment.email || '-'}</h5>
                                        </div>
                                        <div className="col-lg-3 col-sm-6 mb-0">
                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Phone</p>
                                            <h5 className="fs-14 mb-0">{payment.phone || '-'}</h5>
                                        </div>
                                    </div>

                                    {/* Bottom Approval / Rejection Info Section */}
                                    {!isStripe && hasRawDetails && (
                                        <div className="mt-4">
                                            <h5 className="fs-15 fw-bold mb-3 border-bottom pb-2">Verification Info</h5>

                                            {typeof rawDetails === 'object' && (
                                                <div className="row">
                                                    {rawDetails.approved_by && (
                                                        <div className="col-lg-3 col-sm-6 mb-3">
                                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Approved By</p>
                                                            <h5 className="fs-14 mb-0">{rawDetails.approved_by}</h5>
                                                        </div>
                                                    )}
                                                    {rawDetails.approved_at && (
                                                        <div className="col-lg-3 col-sm-6 mb-3">
                                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Approved Date &amp; Time</p>
                                                            <h5 className="fs-14 mb-0">{formatDate(rawDetails.approved_at)}</h5>
                                                        </div>
                                                    )}
                                                    {rawDetails.rejected_by && (
                                                        <div className="col-lg-3 col-sm-6 mb-3">
                                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12 text-danger">Rejected By</p>
                                                            <h5 className="fs-14 mb-0 text-danger">{rawDetails.rejected_by}</h5>
                                                        </div>
                                                    )}
                                                    {rawDetails.rejected_at && (
                                                        <div className="col-lg-3 col-sm-6 mb-3">
                                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12 text-danger">Rejected Date &amp; Time</p>
                                                            <h5 className="fs-14 mb-0 text-danger">{formatDate(rawDetails.rejected_at)}</h5>
                                                        </div>
                                                    )}
                                                    {Object.entries(rawDetails).map(([key, val]) => {
                                                        if (['approved_by', 'approved_at', 'approval_note', 'bank_detail_id', 'approved_by_id', 'rejected_by', 'rejected_at', 'rejected_by_id', 'rejection_reason', 'decision', 'note', 'reason'].includes(key)) return null;
                                                        if (val === null || val === undefined || val === '') return null;
                                                        return (
                                                            <div className="col-lg-3 col-sm-6 mb-3" key={key}>
                                                                <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">{key.replace(/_/g, ' ')}</p>
                                                                <h5 className="fs-14 mb-0">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</h5>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {typeof rawDetails === 'string' && (
                                                <div className="row">
                                                    <div className="col-12 mb-3">
                                                        <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Details</p>
                                                        <h5 className="fs-14 mb-0">{rawDetails}</h5>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Bottom Payment Approval / Rejection Section */}
                                    {payment.can_approve && (
                                        <div className="rounded p-4 bg-warning bg-opacity-10 mt-4">
                                            <h5 className="fs-16 fw-bold text-warning mb-2">
                                                <i className="ri-time-line me-2 fs-18 align-middle"></i>Payment Approval &amp; Decision
                                            </h5>
                                            <p className="text-muted fs-13 mb-3">
                                                This payment is currently <strong>Processing</strong> and requires your action. Enter notes/remarks below and select <strong>Approve Payment</strong> or <strong>Reject Payment</strong>.
                                            </p>
                                            <div className="mb-3">
                                                <label className="form-label fw-semibold fs-13">
                                                    Note / Remarks <span className="text-muted fw-normal fs-12">(Required for Rejection, Optional for Approval)</span>
                                                </label>
                                                <textarea
                                                    className={`form-control ${noteError ? 'is-invalid' : ''}`}
                                                    rows="3"
                                                    placeholder="Enter approval details or rejection reason (e.g., Bank name, reference ID, check number, or reason for rejection)..."
                                                    value={note}
                                                    onChange={(e) => {
                                                        setNote(e.target.value);
                                                        if (e.target.value.trim()) setNoteError('');
                                                    }}
                                                    disabled={approving || rejecting}
                                                ></textarea>
                                                {noteError && <div className="invalid-feedback">{noteError}</div>}
                                            </div>
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-danger px-4 fw-medium"
                                                    onClick={handleRejectClick}
                                                    disabled={approving || rejecting}
                                                >
                                                    <i className="ri-close-circle-line me-1"></i> Reject Payment
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-success px-4 fw-medium"
                                                    onClick={handleApproveClick}
                                                    disabled={approving || rejecting}
                                                >
                                                    <i className="ri-check-double-line me-1"></i> Approve Payment
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Approval Confirmation Modal with Bootstrap JS Animated Flip */}
            <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow">
                        <div className="modal-header border-bottom py-3">
                            <h5 className="modal-title mb-0 fw-semibold">
                                <i className="ri-shield-check-line me-2 text-success fs-18 align-middle"></i>Confirm Payment Approval
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={approving}
                            ></button>
                        </div>
                        <div className="modal-body p-4">
                            <p className="text-muted fs-14 mb-3">
                                Are you sure you want to approve this payment of <strong className="text-dark">{payment?.amount}</strong> for Invoice <strong className="text-dark">{payment?.invoice_id || '-'}</strong>?
                            </p>
                            <div className="bg-light rounded p-3 mb-3 border">
                                <span className="fw-semibold fs-13 text-muted d-block mb-1">Note / Remarks:</span>
                                <p className="mb-0 fs-13 text-dark text-break fw-medium">{note.trim() || <span className="text-muted fs-12 italic">No note provided</span>}</p>
                            </div>
                            <p className="text-muted fs-12 mb-0">
                                <i className="ri-information-line me-1 align-middle text-primary"></i>
                                This action will mark the payment and invoice as <strong>Paid</strong> and update the payment date to today.
                            </p>
                        </div>
                        <div className="modal-footer border-0 pt-0">
                            <button
                                type="button"
                                className="btn btn-light"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={approving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-success px-4"
                                onClick={handleConfirmApprove}
                                disabled={approving}
                            >
                                {approving ? (
                                    <span><i className="ri-loader-4-line spin me-1"></i> Approving...</span>
                                ) : (
                                    <span><i className="ri-check-line me-1"></i> Confirm &amp; Approve</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rejection Confirmation Modal */}
            <div className="modal fade flip" ref={rejectModalRef} tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow">
                        <div className="modal-header border-bottom py-3 bg-danger bg-opacity-10">
                            <h5 className="modal-title mb-0 fw-semibold text-danger">
                                <i className="ri-close-circle-line me-2 fs-18 align-middle"></i>Confirm Payment Rejection
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setShowRejectModal(false)}
                                disabled={rejecting}
                            ></button>
                        </div>
                        <div className="modal-body p-4">
                            <p className="text-muted fs-14 mb-3">
                                Are you sure you want to reject this payment of <strong className="text-dark">{payment?.amount}</strong> for Invoice <strong className="text-dark">{payment?.invoice_id || '-'}</strong>?
                            </p>
                            <div className="bg-light rounded p-3 mb-3 border border-danger-subtle">
                                <span className="fw-semibold fs-13 text-danger d-block mb-1">Rejection Reason / Remarks:</span>
                                <p className="mb-0 fs-13 text-dark text-break fw-medium">{note}</p>
                            </div>
                            <p className="text-muted fs-12 mb-0">
                                <i className="ri-information-line me-1 align-middle text-warning"></i>
                                This action will mark the payment status as <strong>Rejected</strong> and revert the invoice status back to <strong>Unpaid</strong> so the user can pay again.
                            </p>
                        </div>
                        <div className="modal-footer border-0 pt-0">
                            <button
                                type="button"
                                className="btn btn-light"
                                onClick={() => setShowRejectModal(false)}
                                disabled={rejecting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger px-4"
                                onClick={handleConfirmReject}
                                disabled={rejecting}
                            >
                                {rejecting ? (
                                    <span><i className="ri-loader-4-line spin me-1"></i> Rejecting...</span>
                                ) : (
                                    <span><i className="ri-close-line me-1"></i> Confirm &amp; Reject</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

