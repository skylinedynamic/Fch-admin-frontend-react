import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchInvoiceDetails, downloadInvoice } from '../../modules/invoice/services';
import { toast } from 'react-toastify';
import { INVOICE_STATUS_COLORS, STATUS_PAID } from '../../config/invoiceConfig';
import { useAuthStore } from '../../store/auth';
import { ENTITY_TYPE_PARTNER, ENTITY_TYPE_BORROWER } from '../../config/appConfig';
import InvoicePaymentModal from './components/InvoicePaymentModal';
import DetailsSkeletonLoader from '../../components/Loader/DetailsSkeletonLoader';

export default function InvoiceDetails() {
    const { id } = useParams();
    const user = useAuthStore((state) => state.user);
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    useEffect(() => {
        const getDetails = async () => {
            try {
                const response = await fetchInvoiceDetails(id);
                if (response.status) {
                    setInvoice(response.data);
                } else {
                    toast.error(response.message || 'Failed to load invoice details');
                }
            } catch (error) {
                console.error('Error fetching invoice details:', error);
                toast.error('Error loading invoice details');
            } finally {
                setLoading(false);
            }
        };
        getDetails();
    }, [id]);

    const handleDownload = async () => {
        try {
            const blob = await downloadInvoice(id);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice_${invoice?.invoice_id || id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed', error);
            toast.error('Failed to download invoice PDF');
        }
    };

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        // Reload details after payment
        setLoading(true);
        fetchInvoiceDetails(id).then(res => {
            if (res.status) setInvoice(res.data);
            setLoading(false);
        });
    };

    if (!loading && !invoice) {
        return (
            <div className="page-content">
                <div className="container-fluid">
                    <div className="alert alert-danger">Invoice not found.</div>
                </div>
            </div>
        );
    }

    const statusSeverity = invoice?.status ? INVOICE_STATUS_COLORS[invoice.status] || 'primary' : 'primary';

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header */}
                <div className="row">
                    <div className="col-12 d-flex justify-content-between align-items-center py-2">
                        <div>
                            <h4 className="fs-20 mb-1">{invoice ? `Invoice #${invoice.invoice_id}` : 'Invoice Details'}</h4>
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb m-0 fs-12 text-muted">
                                    <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                    <li className="breadcrumb-item"><Link to="/invoices" className="text-muted">Invoices</Link></li>
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
                        <div className="col-xxl-12">
                            <div className="card shadow-sm border-0 overflow-hidden" id="demo">
                                <div className="row">
                                    <div className="col-lg-12">
                                        <div className="card-header bg-soft-primary border-bottom border-primary border-opacity-25 p-4">
                                            <div className="d-flex align-items-center">
                                                <div className="flex-shrink-0 avatar-sm">
                                                    <div className="avatar-title bg-primary bg-opacity-10 text-primary rounded fs-24">
                                                        <i className="ri-file-text-line"></i>
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1 ms-3">
                                                    <h4 className="card-title text-primary mb-1 fs-18">Invoice #{invoice.invoice_id}</h4>
                                                    <p className="text-muted mb-0 fs-13">Date: <span className="fw-medium text-body">{invoice.created_at}</span></p>
                                                </div>
                                                <div className="flex-shrink-0 text-end">
                                                    <h2 className="text-primary mb-1">{invoice.displayable_payment_amount || '-'}</h2>
                                                    <span className={`badge bg-${statusSeverity} fs-12 text-uppercase`}>{invoice.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-lg-12">
                                        <div className="card-body p-4 border-bottom border-bottom-dashed">
                                            <div className="row g-4">
                                                <div className="col-lg-6 col-md-6">
                                                    <h5 className="fs-15 fw-bold mb-3"><i className="ri-file-list-3-line text-muted align-middle me-1"></i> Invoice Details</h5>
                                                    <p className="mb-2 text-muted">Entity Type: <span className="fw-medium text-body">{invoice.entity_type?.includes(ENTITY_TYPE_PARTNER) ? ENTITY_TYPE_PARTNER : invoice.entity_type?.includes(ENTITY_TYPE_BORROWER) ? ENTITY_TYPE_BORROWER : 'Customer'}</span></p>
                                                    {invoice.enrollment_type && (
                                                        <p className="mb-2 text-muted">Enrollment Type: <span className="fw-medium text-body">{invoice.enrollment_type}</span></p>
                                                    )}
                                                </div>
                                                <div className="col-lg-6 col-md-6">
                                                    <h5 className="fs-15 fw-bold mb-3"><i className="ri-user-3-line text-muted align-middle me-1"></i> Billed To</h5>
                                                    <h6 className="fs-14 fw-semibold mb-1">{invoice.name || invoice.customer_name}</h6>
                                                    <p className="text-muted mb-1">{invoice.email}</p>
                                                    {invoice.phone && <p className="text-muted mb-1">{invoice.phone}</p>}
                                                    <p className="text-muted mb-0">{invoice.address || invoice.country || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-lg-12">
                                        <div className="card-body p-4">
                                            <div className="table-responsive">
                                                <table className="table table-borderless text-center table-nowrap align-middle mb-0">
                                                    <thead>
                                                        <tr className="table-active">
                                                            <th scope="col" style={{ width: '50px' }}>#</th>
                                                            <th scope="col" className="text-start">Item Description</th>
                                                            <th scope="col">Rate</th>
                                                            <th scope="col">Quantity</th>
                                                            <th scope="col" className="text-end">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="products-list">
                                                        {invoice.items && invoice.items.length > 0 ? (
                                                            invoice.items.map((item, idx) => (
                                                                <tr key={idx}>
                                                                    <th scope="row">{idx + 1}</th>
                                                                    <td className="text-start">
                                                                        <span className="fw-medium">{item.description || 'Service'}</span>
                                                                    </td>
                                                                    <td>${Number(item.rate || item.amount).toFixed(2)}</td>
                                                                    <td>{item.quantity || 1}</td>
                                                                    <td className="text-end">${Number(item.total || item.amount).toFixed(2)}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <th scope="row">1</th>
                                                                <td className="text-start">
                                                                    <span className="fw-medium">General Payment</span>
                                                                </td>
                                                                <td>{invoice.displayable_payment_amount || '-'}</td>
                                                                <td>1</td>
                                                                <td className="text-end">{invoice.displayable_payment_amount || '-'}</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="border-top border-top-dashed mt-2">
                                                <table className="table table-borderless table-nowrap align-middle mb-0 ms-auto" style={{ width: '250px' }}>
                                                    <tbody>
                                                        <tr>
                                                            <td>Sub Total</td>
                                                            <td className="text-end">{invoice.displayable_payment_amount || '-'}</td>
                                                        </tr>
                                                        <tr className="border-top border-top-dashed fs-15">
                                                            <th scope="row">Total Amount</th>
                                                            <th className="text-end">{invoice.displayable_payment_amount || '-'}</th>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-4 d-flex justify-content-end gap-2">
                                                {invoice.status !== STATUS_PAID && user?.is_host == 0 && invoice.entity_type?.includes(ENTITY_TYPE_PARTNER) && (
                                                    <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)}>
                                                        <i className="ri-secure-payment-line align-middle me-1"></i> Pay Now
                                                    </button>
                                                )}
                                                <button className="btn btn-primary" onClick={handleDownload}>
                                                    <i className="ri-download-2-line align-middle me-1"></i> Download PDF
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <InvoicePaymentModal
                show={showPaymentModal}
                onHide={() => setShowPaymentModal(false)}
                onSuccess={handlePaymentSuccess}
                invoice={invoice}
            />
        </div>
    );
}
