import React, { useEffect, useRef, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { downloadInvoice, sendInvoice, fetchInvoiceDetails } from '../../../modules/invoice/services';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../../store/auth';
import { APP_CONFIG } from '../../../config';
import { STATUS_PAID } from '../../../config/invoiceConfig';
import invoiceLogo from "../../../../assets/images/logo-mail.png";
import InvoicePartyDetails from './InvoicePartyDetails';
import InvoicePreviewSkeleton from './InvoicePreviewSkeleton';

// Helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount || 0);
};

const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

export default function InvoicePreviewModal({ show, onHide, invoice }) {
    const user = useAuthStore((state) => state.user);
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [sendLoading, setSendLoading] = useState(false);
    const [fullInvoice, setFullInvoice] = useState(null);

    useEffect(() => {
        const loadInvoiceData = async () => {
            if (show && invoice?.id) { // Keep invoice?.id here as it's the prop triggering the fetch
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
            const response = await downloadInvoice(displayInvoice.id);
            if (response && response.status && response.data?.file) {
                const blob = base64ToBlob(response.data.file, response.data.mime_type || 'application/pdf');
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', response.data.file_name || `invoice-${displayInvoice.invoice_id || displayInvoice.id}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(url);
            } else {
                throw new Error(response?.message || 'Failed to download invoice PDF');
            }
        } catch (error) {
            const message = error?.message || 'Failed to download invoice';
            console.error('Error downloading invoice:', error);
            toast.error(message);
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
    // This invoice's details have not arrived yet (a failed fetch stores the row
    // itself as fullInvoice, which ends this too). Showing the half-filled row in
    // the meantime made the modal jump once the details landed.
    const detailsPending = !!invoice?.id && fullInvoice?.id !== invoice.id;
    // The API sends the type as a display label ("Commission Payout").
    const isCommissionPayout = displayInvoice?.type?.toLowerCase() === 'commission payout';

    // Who issued the invoice and who pays it, resolved by the API. The list row
    // the modal opens with lacks both, so when the detail fetch fails fall back
    // to what that row does carry.
    const branding = displayInvoice?.branding || {};
    // Invoice paper is white: the document logo, else the sidebar one. A list
    // row (the fallback) still carries primary_logo as a last resort.
    const logoUrl = branding.logo_document_full_url || branding.logo_sidebar_full_url || branding.primary_logo;
    const billedFrom = displayInvoice?.billed_from || {
        company_name: branding.site_name || APP_CONFIG.name,
        address: branding.address,
        city: branding.city,
        state: branding.state,
        postal_code: branding.postal_code,
    };
    const billedTo = displayInvoice?.billed_to || {
        name: displayInvoice?.customer_name || displayInvoice?.name,
        email: displayInvoice?.email,
        phone: displayInvoice?.phone,
        address: displayInvoice?.address,
    };

    // Calculations - only if displayInvoice exists
    // The invoice's own amount. It used to prefer the subscription's total, which
    // priced a fee, a down payment or one installment as the whole plan.
    const amount = parseFloat(String(displayInvoice?.payment_amount ?? '').replace(/[^0-9.]/g, '')) || 0;

    const subtotal = amount;

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-body p-0">
                        {!invoice || detailsPending ? (
                            <InvoicePreviewSkeleton />
                        ) : (
                            <div className="card shadow-none mb-0" id="demo">
                                <div className="row p-2">
                                    <div className="col-lg-12">
                                        <div className="card-header border-bottom-dashed p-4">
                                            <div className="d-flex flex-column flex-sm-row align-items-center">
                                                {logoUrl && (
                                                    <div className="flex-grow-1 text-center text-sm-start">
                                                        {/* Fixed 200x60 box with object-fit, matching the borrower
                                                            portal and the sidebar, so a logo is the same size
                                                            everywhere. Partner logos arrive in every aspect ratio -
                                                            a height-only cap let a wide logo run across the header,
                                                            and `contain` keeps them all inside one box undistorted. */}
                                                        <img
                                                            src={logoUrl}
                                                            className="card-logo card-logo-dark"
                                                            alt="Logo"
                                                            style={{ width: '200px', height: '60px', objectFit: 'contain', objectPosition: 'left center' }}
                                                        />
                                                    </div>
                                                )}
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
                                                <InvoicePartyDetails className="col-6" title="Billed From" party={billedFrom} />
                                                <InvoicePartyDetails
                                                    className="col-6 text-end"
                                                    title={isCommissionPayout ? 'Partner Details' : 'Billed To'}
                                                    party={billedTo}
                                                />
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
                                                <table className="table table-borderless text-center table-nowrap align-middle mb-0" aria-label="Invoice items">
                                                    <thead>
                                                        <tr className="table-active">
                                                            <th scope="col" className="text-start">{isCommissionPayout ? 'Payout Description' : 'Description'}</th>
                                                            <th scope="col" className="text-end">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="products-list">
                                                        <tr>
                                                            <td className="text-start">
                                                                {/* What the invoice charges for; the plan only on an
                                                                    invoice that bills for it (the API omits it otherwise). */}
                                                                <span className="fw-medium">{displayInvoice.type || 'Invoice'}</span>
                                                                {displayInvoice.enrollment_type && <p className="text-muted mb-0">{displayInvoice.enrollment_type}</p>}
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
                                                {!isCommissionPayout && <p className="text-muted mb-1">Payment Method: <span className="fw-medium" id="payment-method">Stripe</span></p>}
                                                <p className="text-muted mb-1">Payment Status: <span className="fw-medium" id="payment-method">{displayInvoice.status}</span></p>
                                                {displayInvoice.payment_date && (
                                                    <p className="text-muted mb-1">Paid Date: <span className="fw-medium" id="paid-date">{displayInvoice.payment_date}</span></p>
                                                )}
                                                {displayInvoice.status?.toLowerCase() == STATUS_PAID.toLowerCase() && (
                                                    <>
                                                        <p className="text-muted mb-1">{isCommissionPayout ? 'Payee Name' : 'Card Holder'}: <span className="fw-medium" id="card-holder-name">{billedTo.name || billedTo.company_name}</span></p>
                                                        <p className="text-muted">Total Amount: <span className="fw-medium">$</span><span id="card-total-amount" className="fw-bold">{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                                                    </>
                                                )}
                                            </div>
                                            <div className="mt-4">
                                                <div className="alert alert-info">
                                                    <p className="mb-0"><span className="fw-semibold">NOTES:</span>
                                                        <span id="note">
                                                            {isCommissionPayout ? (
                                                                displayInvoice.note ? ` ${displayInvoice.note}` : ' No additional notes provided.'
                                                            ) : (
                                                                ' All accounts are to be paid within 7 days from receipt of invoice. To be paid by Stripe. If account is not paid within 7 days the credits details supplied as confirmation of work undertaken will be charged the agreed quoted fee noted above.'
                                                            )}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="hstack gap-2 justify-content-center justify-content-sm-between d-print-none mt-4 flex-wrap">
                                                <button
                                                    className="btn btn-soft-danger flex-grow-1 flex-sm-grow-0"
                                                    onClick={onHide}
                                                >
                                                    <i className="ri-close-line align-bottom me-1"></i>
                                                    Close
                                                </button>
                                                {displayInvoice.branding?.site_name && (
                                                    <button
                                                        className="btn btn-primary shadow-sm flex-grow-1 flex-sm-grow-0"
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
                                                )}
                                                {(user?.is_host == 1 && displayInvoice.status?.toLowerCase() != STATUS_PAID.toLowerCase()) && (
                                                    <button
                                                        className="btn btn-danger shadow-sm flex-grow-1 flex-sm-grow-0"
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
