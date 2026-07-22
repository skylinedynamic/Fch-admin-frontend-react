import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchAdminProviders, updateAdminProvider } from '../../modules/payment-method';
import type { PaymentProvider } from '../../modules/payment-method';
import PaymentMethodsLoader from '../../components/Loader/PaymentMethodsLoader';
import Modal from 'bootstrap/js/dist/modal';

// Static image imports
import stripeLogo from '../../../assets/images/payment_provider/stripe_logo.png';
import squareLogo from '../../../assets/images/payment_provider/square.png';
import ecryptLogo from '../../../assets/images/payment_provider/ecrypt.png';
import authorizeLogo from '../../../assets/images/payment_provider/authorization.png';

const getProviderLogo = (name: string, slug?: string): string => {
    const key = (slug || name || '').toLowerCase().replace(/[\s\.]/g, '');
    switch (key) {
        case 'stripe':
            return stripeLogo;
        case 'square':
            return squareLogo;
        case 'ecrypt':
            return ecryptLogo;
        case 'authorize':
        case 'authorizenet':
        case 'authorization':
            return authorizeLogo;
        default:
            return '';
    }
};

const getProviderDesc = (name: string): string => {
    switch (name?.toLowerCase()) {
        case 'stripe':
            return 'Processes credit cards, digital wallets, Apple Pay, and Google Pay transactions.';
        case 'square':
            return 'Accepts digital terminal configurations, point-of-sale card payments, and online checkout integrations.';
        case 'ecrypt':
            return 'Manages high-volume ACH transfers, direct bank routing, and secure electronic check processing.';
        case 'authorize.net':
        case 'authorizenet':
        case 'authorize':
            return 'Provides secure card processing, merchant accounts, and advanced fraud detection suites.';
        default:
            return 'Configure merchant options and status parameters for checkout integrations.';
    }
};

export default function PaymentMethods(): React.JSX.Element {
    const [providers, setProviders] = useState<PaymentProvider[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    // Custom Modal States
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [targetProvider, setTargetProvider] = useState<PaymentProvider | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<Modal | null>(null);

    // Initialize Bootstrap Modal
    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }
    }, [modalRef]);

    // Manage Modal Visibility
    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (showConfirmModal) {
            modal.show();
        } else {
            modal.hide();
        }
    }, [showConfirmModal]);

    const loadProviders = async () => {
        setLoading(true);
        try {
            const response = await fetchAdminProviders();
            if (response.status) {
                setProviders(response.data || []);
            } else {
                toast.error(response.message || 'Failed to fetch payment providers');
            }
        } catch (error) {
            console.error('Error fetching payment providers:', error);
            toast.error('Failed to load payment providers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProviders();
    }, []);

    const handleStatusToggleRequest = (provider: PaymentProvider) => {
        if (updatingId !== null) return;
        setTargetProvider(provider);
        setShowConfirmModal(true);
    };

    const handleModalClose = () => {
        if (updatingId !== null) return;
        setShowConfirmModal(false);
        setTargetProvider(null);
    };

    const handleStatusToggleConfirm = async () => {
        if (!targetProvider || updatingId !== null) return;
        const newStatus = !targetProvider.status;
        setUpdatingId(targetProvider.id);

        try {
            const response = await updateAdminProvider(targetProvider.id, { status: newStatus });
            if (response.status) {
                setProviders(prev => prev.map(p => p.id === targetProvider.id ? { ...p, status: newStatus } : p));
                toast.success(`${targetProvider.name} status updated successfully.`);
                setShowConfirmModal(false);
                setTargetProvider(null);
            } else {
                toast.error(response.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating provider status:', error);
            toast.error('Error updating provider status');
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header mirrored from Partners.jsx */}
                <div className="row pb-1 mobile-sticky-header animate__animated animate__fadeIn">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Payment Method</h4>
                                <nav aria-label="breadcrumb" className="d-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Payment Method</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <PaymentMethodsLoader />
                ) : (
                    <div className="row animate__animated animate__fadeIn">
                        <div className="col-12">
                            {/* Unified Card layout */}
                            <div className="card shadow-sm border-0 payment-method-card">
                                <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                                    <div className="avatar-sm flex-shrink-0">
                                        <div className="avatar-title bg-primary-subtle text-primary rounded fs-20 payment-method-avatar-title">
                                            <i className="ri-bank-card-2-line"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="card-title mb-0 fs-16 fw-semibold text-dark">Payment Gateways</h5>
                                        <p className="text-muted mb-0 fs-13">Configure checkout payment options and toggle active status</p>
                                    </div>
                                </div>
                                <div className="card-body p-0">
                                    {providers.map((provider) => (
                                        <div className="payment-method-row" key={provider.id}>
                                            {/* Left side: Premium Logo Frame & Details */}
                                            <div className="d-flex align-items-center gap-4 flex-wrap">
                                                <div className="payment-method-logo-box">
                                                    <img 
                                                        src={getProviderLogo(provider.name, provider.slug)} 
                                                        alt={`${provider.name} Logo`} 
                                                        className="payment-method-logo-img"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="d-flex align-items-center gap-2 mb-1.5">
                                                        <h6 className="fs-15 fw-semibold mb-0 text-dark">{provider.name}</h6>
                                                        <span className={`badge d-inline-flex align-items-center gap-1.5 px-2.5 py-0.5 fs-11 ${provider.status ? 'bg-success-subtle text-success' : 'bg-light text-muted'}`}>
                                                            <span className={`status-dot ${provider.status ? 'status-dot-active' : 'status-dot-inactive'}`} />
                                                            {provider.status ? 'Enabled' : 'Disabled'}
                                                        </span>
                                                    </div>
                                                    <p className="text-muted mb-0 fs-13 lh-base max-w-500">
                                                        {getProviderDesc(provider.name)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right side: Switch Switcher inside form-check to prevent overlaps */}
                                            <div className="form-check form-switch form-switch-lg custom-switch-primary m-0 d-flex align-items-center gap-2">
                                                <input
                                                    className="form-check-input cursor-pointer payment-method-switch"
                                                    type="checkbox"
                                                    role="switch"
                                                    id={`provider-status-${provider.id}`}
                                                    checked={!!provider.status}
                                                    onChange={() => handleStatusToggleRequest(provider)}
                                                    disabled={updatingId !== null}
                                                />
                                                <label className="form-check-label text-muted fs-13 fw-medium" htmlFor={`provider-status-${provider.id}`}>
                                                    Active Status
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Status Change Confirmation Modal */}
            <div className="modal fade flip" ref={modalRef} tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow-lg payment-method-modal-content">
                        <div className="modal-header border-bottom-0 p-4 pb-0">
                            <h5 className="modal-title fs-16 fw-semibold text-dark">Confirm Status Change</h5>
                            <button 
                                type="button" 
                                className="btn-close" 
                                onClick={handleModalClose}
                                disabled={updatingId !== null}
                                aria-label="Close"
                            ></button>
                        </div>
                        
                        <div className="modal-body p-4 pt-3">
                            {/* Alert Warning Box */}
                            <div className="alert alert-warning border-0 rounded-3 p-3 mb-4 d-flex align-items-start gap-2 text-start payment-method-alert-warning">
                                <i className="ri-error-warning-line fs-20 text-warning mt-1"></i>
                                <div>
                                    <h6 className="alert-heading text-warning mb-1 fs-14 fw-semibold">Immediate Checkout Impact</h6>
                                    <p className="text-muted mb-0 fs-12 leading-relaxed">
                                        Updating this gateway status will dynamically alter checkout availability for all active portal users.
                                    </p>
                                </div>
                            </div>

                            {/* Gateway Transition Details Diagram */}
                            {targetProvider && (
                                <div className="text-center my-3 p-3 bg-light animate__animated animate__fadeIn payment-method-transition-box">
                                    <h6 className="fs-14 fw-semibold mb-3 text-dark">{targetProvider.name} Status Transition</h6>
                                    <div className="d-flex align-items-center justify-content-center gap-3">
                                        <div className="text-center">
                                            <span className="text-muted d-block fs-11 text-uppercase mb-1">Current State</span>
                                            <span className={`badge ${targetProvider.status ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} fs-12 px-3 py-1.5`}>
                                                {targetProvider.status ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm payment-method-arrow-circle">
                                            <i className="ri-arrow-right-line fs-16 text-primary"></i>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-muted d-block fs-11 text-uppercase mb-1">Target State</span>
                                            <span className={`badge ${targetProvider.status ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'} fs-12 px-3 py-1.5`}>
                                                {targetProvider.status ? 'Disabled' : 'Enabled'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer p-4 pt-0 border-top-0 d-flex justify-content-end gap-2">
                            <button
                                type="button"
                                className="btn btn-light payment-method-btn-round"
                                onClick={handleModalClose}
                                disabled={updatingId !== null}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={`btn ${targetProvider?.status ? 'btn-danger' : 'btn-primary'} payment-method-btn-round`}
                                onClick={handleStatusToggleConfirm}
                                disabled={updatingId !== null}
                            >
                                {updatingId !== null ? (
                                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                ) : null}
                                {targetProvider?.status ? 'Disable Gateway' : 'Enable Gateway'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
