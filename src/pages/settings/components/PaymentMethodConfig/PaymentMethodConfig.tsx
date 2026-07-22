import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchPartnerPaymentProviders, updatePartnerPaymentProviderConfig } from '../../../../modules/settings/services';
import type { PartnerPaymentProvider } from '../../../../modules/settings/services';
import PaymentMethodsLoader from '../../../../components/Loader/PaymentMethodsLoader';
import PaymentMethodConfigForm from './PaymentMethodConfigForm';

// Static image imports matching assets path
import stripeLogo from "../../../../../assets/images/payment_provider/stripe_logo.png";
import squareLogo from "../../../../../assets/images/payment_provider/square.png";
import ecryptLogo from "../../../../../assets/images/payment_provider/ecrypt.png";
import authorizeLogo from "../../../../../assets/images/payment_provider/authorization.png";

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
            return 'Configure merchant credentials and parameters for checkout integrations.';
    }
};

export default function PaymentMethodConfig(): React.JSX.Element {
    const [providers, setProviders] = useState<PartnerPaymentProvider[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedProvider, setSelectedProvider] = useState<PartnerPaymentProvider | null>(null);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    const loadProviders = async () => {
        setLoading(true);
        try {
            const response = await fetchPartnerPaymentProviders();
            if (response.status) {
                setProviders(response.data || []);
            } else {
                toast.error('Failed to retrieve payment methods');
            }
        } catch (error) {
            console.error('Error fetching partner payment providers:', error);
            toast.error('Failed to load payment methods');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProviders();
    }, []);

    const handleBack = () => {
        setSelectedProvider(null);
        loadProviders(); // Refresh config statuses when coming back
    };

    const handleStatusToggle = async (e: React.ChangeEvent<HTMLInputElement>, provider: PartnerPaymentProvider) => {
        e.stopPropagation();
        const newStatus = e.target.checked;
        setTogglingId(provider.id);

        try {
            await updatePartnerPaymentProviderConfig({
                payment_provider_id: provider.id,
                status: newStatus,
                is_default: provider.is_default,
                configuration: {} // Controller is updated to preserve existing configuration in DB
            });
            setProviders(prev => prev.map(p => p.id === provider.id ? { ...p, status: newStatus } : p));
            toast.success(`${provider.name} status updated successfully.`);
        } catch (error) {
            console.error('Error toggling provider status:', error);
            toast.error(`Failed to update ${provider.name} status.`);
        } finally {
            setTogglingId(null);
        }
    };

    if (selectedProvider) {
        return (
            <PaymentMethodConfigForm 
                provider={selectedProvider} 
                onBack={handleBack} 
            />
        );
    }

    return (
        <div className="animate__animated animate__fadeIn">
            {loading ? (
                <PaymentMethodsLoader />
            ) : (
                <div className="card shadow-sm border-0 payment-method-card">
                    <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                        <div className="avatar-sm flex-shrink-0">
                            <div className="avatar-title bg-primary-subtle text-primary rounded fs-20 payment-method-avatar-title">
                                <i className="ri-bank-card-2-line"></i>
                            </div>
                        </div>
                        <div>
                            <h5 className="card-title mb-0 fs-16 fw-semibold text-dark">Payment Integrations</h5>
                            <p className="text-muted mb-0 fs-13">Select a payment method to configure API credentials or toggle its active status</p>
                        </div>
                    </div>
                    <div className="card-body p-0">
                        {providers.length === 0 ? (
                            <div className="text-center p-5">
                                <p className="text-muted mb-0 fs-14">No payment integrations are currently active in the system.</p>
                            </div>
                        ) : (
                            providers.map((provider) => (
                                <div 
                                    className="payment-method-row cursor-pointer hover-bg-light position-relative" 
                                    key={provider.id}
                                    onClick={() => setSelectedProvider(provider)}
                                >
                                    {togglingId === provider.id && (
                                        <div className="position-absolute w-100 h-100 top-0 start-0 d-flex align-items-center justify-content-center bg-white bg-opacity-75" style={{ zIndex: 10 }}>
                                            <div className="spinner-border text-primary spinner-border-sm" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Left side: Logo & Description */}
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
                                                <span className={`badge d-inline-flex align-items-center gap-1.5 px-2.5 py-0.5 fs-11 ${provider.is_configured ? 'bg-success-subtle text-success' : 'bg-light text-muted'}`}>
                                                    <span className={`status-dot ${provider.is_configured ? 'status-dot-active' : 'status-dot-inactive'}`} />
                                                    {provider.is_configured ? 'Configured' : 'Not Configured'}
                                                </span>
                                            </div>
                                            <p className="text-muted mb-0 fs-13 lh-base max-w-500">
                                                {getProviderDesc(provider.name)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right side: Bootstrap Switch Switcher inside form-check to prevent overlaps */}
                                    <div 
                                        className="form-check form-switch form-switch-lg custom-switch-primary m-0 d-flex align-items-center gap-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <input
                                            className="form-check-input cursor-pointer payment-method-switch"
                                            type="checkbox"
                                            role="switch"
                                            id={`provider-list-status-${provider.id}`}
                                            checked={!!provider.status}
                                            onChange={(e) => handleStatusToggle(e, provider)}
                                            disabled={togglingId !== null}
                                        />
                                        <label className="form-check-label text-muted fs-13 fw-medium" htmlFor={`provider-list-status-${provider.id}`}>
                                            Active Status
                                        </label>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
