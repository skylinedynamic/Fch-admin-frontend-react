import React, { useEffect, useRef, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { downloadInvoice, sendInvoice, fetchInvoiceDetails } from '../../../modules/invoice/services';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../../store/auth';
import { APP_CONFIG } from '../../../config';
import { STATUS_PAID } from '../../../config/invoiceConfig';
import invoiceLogo from "../../../../public/assets/images/logo-mail.png";

// Helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount || 0);
};

export default function InvoicePreviewModal({ show, onHide, invoice }) {
    const user = useAuthStore((state) => state.user);
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [sendLoading, setSendLoading] = useState(false);
    const [fullInvoice, setFullInvoice] = useState(null);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        const loadInvoiceData = async () => {
            if (show && invoice?.id) { // Keep invoice?.id here as it's the prop triggering the fetch
                setFetching(true);
                try {
                    const response = await fetchInvoiceDetails(invoice.id); // Keep invoice.id here for the initial fetch
                    if (response.status) {
                        setFullInvoice(response.data);
                    } else {
                        // Fallback to passed invoice if API fails
                        setFullInvoice(invoice); // Keep invoice here as it's the fallback
                        toast.error(response.message || 'Failed to fetch full invoice details');
                    }
                } catch (error) {
                    console.error('Error fetching invoice details:', error);
                    setFullInvoice(invoice); // Keep invoice here as it's the fallback
                    toast.error('Failed to load full invoice details');
                } finally {
                    setFetching(false);
                }
            } else {
                setFullInvoice(null);
            }
        };

        loadInvoiceData();
    }, [show, invoice?.id]); // Keep invoice?.id here as it's the prop triggering the fetch

    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: true,
                keyboard: true,
            });

            // Handle Bootstrap's internal hide events (backdrop click, esc key)
            modalRef.current.addEventListener('hidden.bs.modal', () => {
                if (onHide) onHide();
            });
        }

        return () => {
            if (modalInstanceRef.current) {
                modalInstanceRef.current.hide();
                modalInstanceRef.current.dispose();
                modalInstanceRef.current = null;
            }
        };
    }, [modalRef.current]); // Dependent on modalRef.current to ensure it re-runs when ref is attached

    // Show/Hide Logic
    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            modal.show();
        } else {
            modal.hide();
        }
    }, [show]);

    // Reset loading states when modal closes or invoice changes
    useEffect(() => {
        if (!show) {
            setDownloadLoading(false);
            setSendLoading(false);
        }
    }, [show, invoice]); // Keep invoice here as it's the prop that might change

    const handleDownload = async () => {
        if (!displayInvoice?.id || downloadLoading) return;
        setDownloadLoading(true);
        try {
            const blob = await downloadInvoice(displayInvoice.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice-${displayInvoice.invoice_id || displayInvoice.id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {

        } finally {
            setDownloadLoading(false);
        }
    };

    const handleSend = async () => {
        if (!displayInvoice?.id || sendLoading) return;
        setSendLoading(true);
        try {
            const response = await sendInvoice(displayInvoice.id);
            if (response.status) {
                toast.success('Invoice sent successfully.');
            } else {
                toast.error(response.message || 'Failed to send invoice');
            }
        } catch (error) {
            console.error('Error sending invoice:', error);
            toast.error('Failed to send invoice');
        } finally {
            setSendLoading(false);
        }
    };

    // Use fullInvoice if available, otherwise fallback to the row-level invoice
    const displayInvoice = fullInvoice || invoice;

    // Calculations - only if displayInvoice exists
    const amount = displayInvoice ? (typeof displayInvoice.payable_amount_sub === 'string'
        ? parseFloat(displayInvoice.payable_amount_sub)
        : displayInvoice.payable_amount_sub || (typeof displayInvoice.payment_amount === 'string'
            ? parseFloat(displayInvoice.payment_amount)
            : displayInvoice.payment_amount || 0)) : 0;

    const subtotal = amount;

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-body p-0">
                        {!invoice ? (
                            <div className="p-5 text-center">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : (
                            <div className="card shadow-none mb-0" id="demo">
                                <div className="row p-2">
                                    <div className="col-lg-12">
                                        <div className="card-header border-bottom-dashed p-4">
                                            <div className="d-flex flex-column flex-sm-row align-items-center">
                                                <div className="flex-grow-1 text-center text-sm-start">
                                                    <img src={invoiceLogo} className="card-logo card-logo-dark" alt="FCH Logo" height="65" />
                                                </div>
                                                <div className="flex-shrink-0 mt-sm-0 mt-4 text-center text-sm-end">
                                                    <h6 className="mb-1"><span className="text-muted fw-normal">Invoice No:</span> <span id="legal-register-no" className="fw-semibold"> #{displayInvoice.invoice_id || displayInvoice.id}</span></h6>
                                                    {/* <h6 className="mb-1"><span className="text-muted fw-normal">Email:</span> <span id="email" className="fw-semibold"> support@fourcornerholdings.com</span></h6>
                                                    <h6 className="mb-1"><span className="text-muted fw-normal">Website:</span> <a href="https://fourcornerholdings.com" className="link-primary" target="_blank" id="website"> www.fourcornerholdings.com</a></h6>
                                                    <h6 className="mb-0"><span className="text-muted fw-normal">Contact No: </span><span id="contact-no" className="fw-semibold"> +(01) 234 6789</span></h6> */}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-lg-12 border-top border-top-dashed">
                                        <div className="card-body p-4">
                                            <div className="row g-3">
                                                <div className="col-6">
                                                    <h6 className="text-muted text-uppercase fw-semibold mb-3">Address</h6>
                                                    <p className="text-muted mb-1">{APP_CONFIG.name}</p>
                                                    {/* <p className="text-muted mb-0">California, United States</p> */}
                                                </div>
                                                <div className="col-6 text-end">
                                                    <h6 className="text-muted text-uppercase fw-semibold mb-3">Billing Address</h6>
                                                    <p className="fw-medium mb-2" id="billing-name">{displayInvoice.customer_name || displayInvoice.name || ''}</p>
                                                    <p className="text-muted mb-1" id="billing-address-line-1">{displayInvoice.address || ''}</p>
                                                    {displayInvoice.phone && <p className="text-muted mb-1"><span>Phone: </span><span id="billing-phone-no">{displayInvoice.phone}</span></p>}
                                                    <p className="text-muted mb-0"><span>Email: </span><span id="billing-email">{displayInvoice.email || ''}</span> </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-lg-12">
                                        <div className="card-body p-sm-4 p-2">
                                            <div className="row g-3 text-center text-sm-start">
                                                <div className="col-lg-3 col-6">
                                                    <p className="text-muted mb-2 text-uppercase fw-semibold">Invoice No</p>
                                                    <h5 className="fs-14 mb-0">#<span id="invoice-no">{displayInvoice.invoice_id || displayInvoice.id}</span></h5>
                                                </div>
                                                <div className="col-lg-3 col-6">
                                                    <p className="text-muted mb-2 text-uppercase fw-semibold">Date</p>
                                                    <h5 className="fs-14 mb-0"><span id="invoice-date">{displayInvoice.created_at ? new Date(displayInvoice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span></h5>
                                                </div>
                                                <div className="col-lg-3 col-6">
                                                    <p className="text-muted mb-2 text-uppercase fw-semibold">Payment Status</p>
                                                    <span className={`badge bg-${displayInvoice.status?.toLowerCase() === STATUS_PAID.toLowerCase() ? 'success' : 'warning'}-subtle text-${displayInvoice.status?.toLowerCase() === STATUS_PAID.toLowerCase() ? 'success' : 'warning'} fs-11 text-uppercase`} id="payment-status">
                                                        {displayInvoice.status || 'Pending'}
                                                    </span>
                                                </div>
                                                <div className="col-lg-3 col-6 text-sm-end">
                                                    <p className="text-muted mb-2 text-uppercase fw-semibold">Total Amount</p>
                                                    <h5 className="fs-14 mb-0">$<span id="total-amount">{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></h5>
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
                                                            <th scope="col" className="text-start">Enrollment Details</th>
                                                            <th scope="col" className="text-end">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="products-list">
                                                        <tr>
                                                            <td className="text-start">
                                                                <span className="fw-medium">{displayInvoice.enrollment_type || ''}</span>
                                                            </td>
                                                            <td className="text-end">{formatCurrency(subtotal)}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="border-top border-top-dashed mt-2">
                                                <table id="invoice-summary" className="table table-borderless table-nowrap align-middle mb-0 ms-auto" style={{ width: '250px' }}>
                                                    <tbody>
                                                        <tr>
                                                            <td>Sub Total</td>
                                                            <td className="text-end"><span id="invoice-subtotal">{formatCurrency(subtotal)}</span></td>
                                                        </tr>
                                                        <tr className="border-top border-top-dashed fs-15">
                                                            <th scope="row">Total Amount</th>
                                                            <th className="text-end"><span id="invoice-total">{formatCurrency(amount)}</span></th>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-3">
                                                <h6 className="text-muted text-uppercase fw-semibold mb-3">Payment Details:</h6>
                                                <p className="text-muted mb-1">Payment Method: <span className="fw-medium" id="payment-method">Stripe</span></p>
                                                <p className="text-muted mb-1">Payment Status: <span className="fw-medium" id="payment-method">{displayInvoice.status}</span></p>
                                                <p className="text-muted mb-1">Card Holder: <span className="fw-medium" id="card-holder-name">{displayInvoice.customer_name || displayInvoice.name}</span></p>
                                                <p className="text-muted">Total Amount: <span className="fw-medium">$</span><span id="card-total-amount" className="fw-bold">{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                                            </div>
                                            <div className="mt-4">
                                                <div className="alert alert-info">
                                                    <p className="mb-0"><span className="fw-semibold">NOTES:</span>
                                                        <span id="note"> All accounts are to be paid within 7 days from receipt of invoice. To be paid by Stripe.
                                                            If account is not paid within 7
                                                            days the credits details supplied as confirmation of work undertaken
                                                            will be charged the agreed quoted fee noted above.
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="hstack gap-2 justify-content-center justify-content-sm-between d-print-none mt-4 flex-wrap">
                                                <button
                                                    className="btn btn-default"
                                                    onClick={onHide}
                                                >
                                                    <i className="ri-close-line align-bottom me-1"></i>
                                                    Close
                                                </button>
                                                <div className="hstack gap-2">
                                                    <button
                                                        className="btn btn-primary shadow-sm"
                                                        onClick={handleDownload}
                                                        disabled={downloadLoading}
                                                    >
                                                        {downloadLoading ? (
                                                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                        ) : (
                                                            <i className="ri-download-2-line align-bottom me-1"></i>
                                                        )}
                                                        Download
                                                    </button>
                                                    {(user?.is_host == 1 && displayInvoice.status?.toLowerCase() != STATUS_PAID.toLowerCase()) && (
                                                        // {(((displayInvoice?.borrower_id && user?.is_host == 0) || displayInvoice.status?.toLowerCase() != STATUS_PAID.toLowerCase())) && (
                                                        <button
                                                            className="btn btn-danger shadow-sm"
                                                            onClick={handleSend}
                                                            disabled={sendLoading}
                                                        >
                                                            {sendLoading ? (
                                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                            ) : (
                                                                <i className="ri-send-plane-fill align-bottom me-1"></i>
                                                            )}
                                                            E-Mail Invoice
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
