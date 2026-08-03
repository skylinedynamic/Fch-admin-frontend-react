import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchPartnerPaymentProviders } from '../../../../modules/settings/services';
import type { PartnerPaymentProvider } from '../../../../modules/settings/services';
import PaymentMethodsLoader from '../../../../components/Loader/PaymentMethodsLoader';
import PaymentMethodConfigForm from './PaymentMethodConfigForm';

import { getProviderDesc } from '../../../../config';

export default function PaymentMethodConfig(): React.JSX.Element {
    const [providers, setProviders] = useState<PartnerPaymentProvider[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedProvider, setSelectedProvider] = useState<PartnerPaymentProvider | null>(null);

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

    if (selectedProvider) {
        return (
            <PaymentMethodConfigForm 
                provider={selectedProvider} 
                onBack={handleBack} 
            />
        );
    }

    return (
        <>
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
                                        {/* Left side: Logo & Description */}
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
                                                    <span className={`badge d-inline-flex align-items-center gap-1.5 px-2.5 py-0.5 fs-11 ${provider.status ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                                        <span className={`status-dot ${provider.status ? 'status-dot-active' : 'status-dot-inactive'}`} />
                                                        {provider.status ? 'Active' : 'Inactive'}
                                                    </span>
                                                    {provider.status && provider.payment_mode && (
                                                        <span className={`badge d-inline-flex align-items-center gap-1.5 px-2.5 py-0.5 fs-11 ${provider.payment_mode === 'production' ? 'bg-warning-subtle text-warning' : 'bg-info-subtle text-info'}`}>
                                                            {provider.payment_mode === 'production' ? '🚀 Production' : '🧪 Sandbox'}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-muted mb-0 fs-13 lh-base max-w-500">
                                                    {getProviderDesc(provider.name, 'Configure merchant credentials and parameters for checkout integrations.')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right side: Chevron */}
                                        <div className="text-muted fs-16 ps-3">
                                            <i className="ri-arrow-right-s-line"></i>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
