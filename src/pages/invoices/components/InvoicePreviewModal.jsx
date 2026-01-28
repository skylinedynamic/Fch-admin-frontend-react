import React, { useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';

// Helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount || 0);
};

export default function InvoicePreviewModal({ show, onHide, invoice }) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: true,
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

    // No early return for invoice here, as we need the modal Ref to be stable
    
    // Calculations - only if invoice exists
    const amount = invoice ? (typeof invoice.payment_amount === 'string' 
        ? parseFloat(invoice.payment_amount) 
        : invoice.payment_amount || 0) : 0;
    
    const subtotal = amount;

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header">
                        <h5 className="modal-title fw-bold" id="invoiceModalXLLabel">Invoice Preview</h5>
                        <button type="button" className="btn-close" onClick={onHide} aria-label="Close"></button>
                    </div>
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
                                                    <img src="/assets/images/Four Corner Holdings LLC.png" className="card-logo card-logo-dark" alt="logo dark" height="80" />
                                                    <div className="mt-sm-4 mt-3">
                                                        <h6 className="text-muted text-uppercase fw-semibold">Address</h6>
                                                        <p className="text-muted mb-1" id="address-details">California, United States</p>
                                                        <p className="text-muted mb-0" id="zip-code"><span>Zip-code:</span> 90201</p>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 mt-sm-0 mt-4 text-center text-sm-end">
                                                    <h6 className="mb-1"><span className="text-muted fw-normal">Invoice No:</span> <span id="legal-register-no" className="fw-semibold"> #{invoice.invoice_id || invoice.id}</span></h6>
                                                    <h6 className="mb-1"><span className="text-muted fw-normal">Email:</span> <span id="email" className="fw-semibold"> support@fourcornerholdings.com</span></h6>
                                                    <h6 className="mb-1"><span className="text-muted fw-normal">Website:</span> <a href="https://fourcornerholdings.com" className="link-primary" target="_blank" id="website"> www.fourcornerholdings.com</a></h6>
                                                    <h6 className="mb-0"><span className="text-muted fw-normal">Contact No: </span><span id="contact-no" className="fw-semibold"> +(01) 234 6789</span></h6>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-lg-12">
                                        <div className="card-body p-sm-4 p-2">
                                            <div className="row g-3 text-center text-sm-start">
                                                <div className="col-lg-3 col-6">
                                                    <p className="text-muted mb-2 text-uppercase fw-semibold">Invoice No</p>
                                                    <h5 className="fs-14 mb-0">#<span id="invoice-no">{invoice.invoice_id || invoice.id}</span></h5>
                                                </div>
                                                <div className="col-lg-3 col-6">
                                                    <p className="text-muted mb-2 text-uppercase fw-semibold">Date</p>
                                                    <h5 className="fs-14 mb-0"><span id="invoice-date">{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span></h5>
                                                </div>
                                                <div className="col-lg-3 col-6">
                                                    <p className="text-muted mb-2 text-uppercase fw-semibold">Payment Status</p>
                                                    <span className={`badge bg-${invoice.status?.toLowerCase() === 'paid' ? 'success' : 'warning'}-subtle text-${invoice.status?.toLowerCase() === 'paid' ? 'success' : 'warning'} fs-11 text-uppercase`} id="payment-status">
                                                        {invoice.status || 'Pending'}
                                                    </span>
                                                </div>
                                                <div className="col-lg-3 col-6">
                                                    <p className="text-muted mb-2 text-uppercase fw-semibold">Total Amount</p>
                                                    <h5 className="fs-14 mb-0">$<span id="total-amount">{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></h5>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-lg-12 border-top border-top-dashed">
                                        <div className="card-body p-4">
                                            <div className="row g-3">
                                                <div className="col-12">
                                                    <h6 className="text-muted text-uppercase fw-semibold mb-3">Billing Address</h6>
                                                    <p className="fw-medium mb-2" id="billing-name">{invoice.customer_name || 'Customer Name'}</p>
                                                    <p className="text-muted mb-1" id="billing-address-line-1">{invoice.address || 'Address not specified'}</p>
                                                    <p className="text-muted mb-1"><span>Phone: </span><span id="billing-phone-no">{invoice.phone || 'N/A'}</span></p>
                                                    <p className="text-muted mb-0"><span>Country: </span><span id="billing-country">{invoice.country || 'N/A'}</span> </p>
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
                                                            <th scope="col" className="text-start">Product Details</th>
                                                            <th scope="col">Rate</th>
                                                            <th scope="col">Quantity</th>
                                                            <th scope="col" className="text-end">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="products-list">
                                                        <tr>
                                                            <th scope="row">01</th>
                                                            <td className="text-start">
                                                                <span className="fw-medium">{invoice.description || 'Platform Service Enrollment'}</span>
                                                                <p className="text-muted mb-0">Payment Cycle: {invoice.cycle || 'One Time'}</p>
                                                            </td>
                                                            <td>{formatCurrency(subtotal)}</td>
                                                            <td>01</td>
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
                                                <p className="text-muted mb-1">Payment Method: <span className="fw-medium" id="payment-method">Stripe / Card</span></p>
                                                <p className="text-muted mb-1">Card Holder: <span className="fw-medium" id="card-holder-name">{invoice.customer_name}</span></p>
                                                <p className="text-muted mb-1">Card Number: <span className="fw-medium" id="card-number">xxxx xxxx xxxx 1234</span></p>
                                                <p className="text-muted">Total Amount: <span className="fw-medium">$ </span><span id="card-total-amount" className="fw-bold">{amount.toFixed(2)}</span></p>
                                            </div>
                                            <div className="mt-4">
                                                <div className="alert alert-info">
                                                    <p className="mb-0"><span className="fw-semibold">NOTES:</span>
                                                        <span id="note"> All accounts are to be paid within 7 days from receipt of invoice. To be paid by cheque or
                                                            credit card or direct payment online. If account is not paid within 7
                                                            days the credits details supplied as confirmation of work undertaken
                                                            will be charged the agreed quoted fee noted above.
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="hstack gap-2 justify-content-center justify-content-sm-end d-print-none mt-4 flex-wrap">
                                                <button className="btn btn-primary shadow-sm"><i className="ri-download-2-line align-bottom me-1"></i> Download Invoice</button>
                                                <button className="btn btn-danger shadow-sm"><i className="ri-send-plane-fill align-bottom me-1"></i> Send Invoice</button>
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
