import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import { fetchPaymentById } from '../../modules/payment/services';
import { toast } from 'react-toastify';
import { PAYMENT_STATUS_COLORS, PAYMENT_ENVIRONMENT_COLORS, PAYMENT_ENVIRONMENT_LABELS } from '../../config/paymentConfig';
import { ENTITY_TYPE_PARTNER, ENTITY_TYPE_BORROWER } from '../../config/appConfig';
import DetailsSkeletonLoader from '../../components/Loader/DetailsSkeletonLoader';

export default function PaymentDetails() {
    const { id } = useParams();
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getDetails = async () => {
            try {
                const response = await fetchPaymentById(id);
                // Depending on the backend response format, the data could be nested
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

    if (!loading && !payment) {
        return (
            <div className="page-content">
                <div className="container-fluid">
                    <div className="alert alert-danger">Payment not found.</div>
                </div>
            </div>
        );
    }

    const status = payment?.status?.toLowerCase();
    const statusColor = PAYMENT_STATUS_COLORS[status] || 'primary';
    const envVal = payment?.is_environment ? 1 : 0;
    const envColor = PAYMENT_ENVIRONMENT_COLORS[envVal] || 'info';
    const envLabel = PAYMENT_ENVIRONMENT_LABELS[envVal] || 'Sandbox';
    const payerType = payment?.entity_type?.includes(ENTITY_TYPE_PARTNER) ? ENTITY_TYPE_PARTNER : payment?.entity_type?.includes(ENTITY_TYPE_BORROWER) ? ENTITY_TYPE_BORROWER : 'Customer';

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header */}
                <PageHeader 
                    title="Payment Details" 
                    breadcrumbs={[
                        { label: 'Payments', path: '/payments' },
                        { label: 'Details' }
                    ]} 
                />

                {loading ? (
                    <DetailsSkeletonLoader />
                ) : (
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="card border-0 overflow-hidden shadow-sm">
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
                                            <p className="text-muted mb-0 fs-13">Date: {payment.transaction_date || payment.created_at || '-'}</p>
                                        </div>
                                        <div className="flex-shrink-0 text-end">
                                            <h2 className="text-primary mb-1">{payment.amount || '-'}</h2>
                                            <span className={`badge bg-${statusColor} fs-12 text-uppercase`}>{payment.status}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-body p-4">
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
                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Environment</p>
                                            <span className={`badge bg-${envColor} text-uppercase`}>{envLabel}</span>
                                        </div>
                                        <div className="col-lg-3 col-sm-6 mb-3">
                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Transaction ID</p>
                                            <h5 className="fs-14 mb-0">{payment.transaction_id || '-'}</h5>
                                        </div>
                                    </div>

                                    <h5 className="fs-15 fw-bold mb-3 border-bottom pb-2">Payer Information</h5>
                                    <div className="row bg-light rounded p-3 m-0">
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
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
