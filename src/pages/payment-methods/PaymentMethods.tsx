import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchAdminProviders, updateAdminProvider } from '../../modules/payment-method';
import type { PaymentProvider } from '../../modules/payment-method';
import PaymentMethodsLoader from '../../components/Loader/PaymentMethodsLoader';
import PaymentMethodStatusModal from '../../components/Common/Modals/PaymentMethodStatusModal';
import { getProviderDesc } from '../../config';

export default function PaymentMethods(): React.JSX.Element {
    const [providers, setProviders] = useState<PaymentProvider[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    // Custom Modal States
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [targetProvider, setTargetProvider] = useState<PaymentProvider | null>(null);

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
                                                        src={provider.logo || ''} 
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
            <PaymentMethodStatusModal
                show={showConfirmModal}
                targetProvider={targetProvider}
                updating={updatingId !== null}
                onClose={handleModalClose}
                onConfirm={handleStatusToggleConfirm}
            />
        </div>
    );
}
