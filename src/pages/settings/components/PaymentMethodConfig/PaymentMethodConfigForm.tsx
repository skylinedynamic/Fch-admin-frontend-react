import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchPartnerPaymentProviderConfig, updatePartnerPaymentProviderConfig } from '../../../../modules/settings/services';
import type { PartnerPaymentProvider } from '../../../../modules/settings/services';
import { StripeConfigSkeleton } from '../../../../components/Loader/SpecificSkeletons';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import DynamicActionModal from '../../../../components/Common/Modals/DynamicActionModal';
import { useAuthStore } from '../../../../store/auth/authStore';
import { apiClient } from '../../../../lib/http/apiClient';

// Static logo imports
import stripeLogo from "../../../../../assets/images/payment_provider/stripe_logo.png";
import squareLogo from "../../../../../assets/images/payment_provider/square.png";
import ecryptLogo from "../../../../../assets/images/payment_provider/ecrypt.png";
import authorizeLogo from "../../../../../assets/images/payment_provider/authorization.png";

interface PaymentMethodConfigFormProps {
    provider: PartnerPaymentProvider;
    onBack: () => void;
}

interface FormErrors {
    [key: string]: string | null;
}

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

export default function PaymentMethodConfigForm({ provider, onBack }: PaymentMethodConfigFormProps): React.JSX.Element {
    const user = useAuthStore((state: any) => state.user);
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState<boolean>(false);
    const [fetching, setFetching] = useState<boolean>(true);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [pendingMode, setPendingMode] = useState<string | null>(null);
    const [isDefault, setIsDefault] = useState<boolean>(false);
    
    // Dynamic config form state containing keys for whichever provider is configured
    const [formData, setFormData] = useState<Record<string, any>>({
        payment_mode: 'sandbox',
        partner_auto_charge_host_fee: 1
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [fixedEnrollmentAmount, setFixedEnrollmentAmount] = useState<number>(0);

    const slug = provider.slug || provider.name.toLowerCase().replace(/[\s\.]/g, '');

    useEffect(() => {
        loadConfig();
        if (slug === 'stripe') {
            fetchFixedPlan();
        }
    }, [provider.id]);

    const fetchFixedPlan = async () => {
        try {
            const response = await apiClient.get('/common/partner-plans/fixed-enrollment');
            if (response.data?.status && response.data?.data?.payment_amount) {
                setFixedEnrollmentAmount(Number(response.data.data.payment_amount));
            }
        } catch (error) {
            console.error('Failed to fetch fixed enrollment plan:', error);
        }
    };

    const loadConfig = async () => {
        try {
            setFetching(true);
            const response = await fetchPartnerPaymentProviderConfig(provider.id);
            if (response && response.status && response.data) {
                const linkage = response.data;
                setIsDefault(!!linkage.is_default);
                const config = linkage.configuration || {};
                
                // Initialize fields depending on payment gateway type
                if (slug === 'stripe') {
                    setFormData({
                        stripe_key_sandbox: config.stripe_key_sandbox || config.sandbox?.publishable_key || config.sandbox?.stripe_key_sandbox || '',
                        stripe_secret_sandbox: config.stripe_secret_sandbox || config.sandbox?.secret_key || config.sandbox?.stripe_secret_sandbox || '',
                        stripe_key_production: config.stripe_key_production || config.production?.publishable_key || config.production?.stripe_key_production || '',
                        stripe_secret_production: config.stripe_secret_production || config.production?.secret_key || config.production?.stripe_secret_production || '',
                        payment_mode: config.payment_mode || 'sandbox',
                        partner_auto_charge_host_fee: config.partner_auto_charge_host_fee !== undefined
                            ? (config.partner_auto_charge_host_fee == 1 || config.partner_auto_charge_host_fee === 'true' || config.partner_auto_charge_host_fee === true)
                            : 1
                    });
                } else if (slug === 'square') {
                    setFormData({
                        square_app_id_sandbox: config.square_app_id_sandbox || config.sandbox?.app_id || config.sandbox?.square_app_id || config.sandbox?.square_app_id_sandbox || '',
                        square_token_sandbox: config.square_token_sandbox || config.sandbox?.access_token || config.sandbox?.token || config.sandbox?.square_token || config.sandbox?.square_token_sandbox || '',
                        square_app_id_production: config.square_app_id_production || config.production?.app_id || config.production?.square_app_id || config.production?.square_app_id_production || '',
                        square_token_production: config.square_token_production || config.production?.access_token || config.production?.token || config.production?.square_token || config.production?.square_token_production || '',
                        payment_mode: config.payment_mode || 'sandbox'
                    });
                } else if (slug === 'authorizenet' || slug === 'authorize') {
                    setFormData({
                        authorize_login_id_sandbox: config.authorize_login_id_sandbox || config.sandbox?.login_id || config.sandbox?.authorize_login_id || config.sandbox?.authorize_login_id_sandbox || '',
                        authorize_transaction_key_sandbox: config.authorize_transaction_key_sandbox || config.sandbox?.transaction_key || config.sandbox?.authorize_transaction_key || config.sandbox?.authorize_transaction_key_sandbox || '',
                        authorize_login_id_production: config.authorize_login_id_production || config.production?.login_id || config.production?.authorize_login_id || config.production?.authorize_login_id_production || '',
                        authorize_transaction_key_production: config.authorize_transaction_key_production || config.production?.transaction_key || config.production?.authorize_transaction_key || config.production?.authorize_transaction_key_production || '',
                        payment_mode: config.payment_mode || 'sandbox'
                    });
                } else {
                    // Default configuration structure for unknown/other providers
                    setFormData({
                        client_key_sandbox: config.client_key_sandbox || config.sandbox?.client_key || config.sandbox?.key || config.sandbox?.client_key_sandbox || '',
                        client_secret_sandbox: config.client_secret_sandbox || config.sandbox?.client_secret || config.sandbox?.secret || config.sandbox?.client_secret_sandbox || '',
                        client_key_production: config.client_key_production || config.production?.client_key || config.production?.key || config.production?.client_key_production || '',
                        client_secret_production: config.client_secret_production || config.production?.client_secret || config.production?.secret || config.production?.client_secret_production || '',
                        payment_mode: config.payment_mode || 'sandbox'
                    });
                }
            }
        } catch (error) {
            toast.error(`Failed to load ${provider.name} configuration.`);
        } finally {
            setFetching(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked ? 1 : 0 }));
    };

    const handleModeChangeRequest = (newMode: string) => {
        if (newMode !== formData.payment_mode) {
            setPendingMode(newMode);
            setShowModal(true);
        }
    };

    const confirmModeChange = () => {
        if (pendingMode) {
            setFormData(prev => ({ ...prev, payment_mode: pendingMode }));
            setErrors({});
        }
        setShowModal(false);
        setPendingMode(null);
    };

    const cancelModeChange = () => {
        setShowModal(false);
        setPendingMode(null);
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        const mode = formData.payment_mode || 'sandbox';
        const suffix = `_${mode}`;

        if (slug === 'stripe') {
            if (!formData[`stripe_key${suffix}`]) {
                newErrors[`stripe_key${suffix}`] = 'Stripe Publishable Key is required.';
            }
            if (!formData[`stripe_secret${suffix}`]) {
                newErrors[`stripe_secret${suffix}`] = 'Stripe Secret Key is required.';
            }
        } else if (slug === 'square') {
            if (!formData[`square_app_id${suffix}`]) {
                newErrors[`square_app_id${suffix}`] = 'Square Application ID is required.';
            }
            if (!formData[`square_token${suffix}`]) {
                newErrors[`square_token${suffix}`] = 'Square Access Token is required.';
            }
        } else if (slug === 'authorizenet' || slug === 'authorize') {
            if (!formData[`authorize_login_id${suffix}`]) {
                newErrors[`authorize_login_id${suffix}`] = 'Authorize.Net API Login ID is required.';
            }
            if (!formData[`authorize_transaction_key${suffix}`]) {
                newErrors[`authorize_transaction_key${suffix}`] = 'Authorize.Net Transaction Key is required.';
            }
        } else {
            if (!formData[`client_key${suffix}`]) {
                newErrors[`client_key${suffix}`] = 'Client Key is required.';
            }
            if (!formData[`client_secret${suffix}`]) {
                newErrors[`client_secret${suffix}`] = 'Client Secret is required.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            // Prepare configuration with both flat and nested keys for backend compatibility
            const configuration: Record<string, any> = { ...formData };
            if (slug === 'stripe') {
                configuration.sandbox = {
                    publishable_key: formData.stripe_key_sandbox || '',
                    secret_key: formData.stripe_secret_sandbox || ''
                };
                configuration.production = {
                    publishable_key: formData.stripe_key_production || '',
                    secret_key: formData.stripe_secret_production || ''
                };
            } else if (slug === 'square') {
                configuration.sandbox = {
                    app_id: formData.square_app_id_sandbox || '',
                    access_token: formData.square_token_sandbox || ''
                };
                configuration.production = {
                    app_id: formData.square_app_id_production || '',
                    access_token: formData.square_token_production || ''
                };
            } else if (slug === 'authorizenet' || slug === 'authorize') {
                configuration.sandbox = {
                    login_id: formData.authorize_login_id_sandbox || '',
                    transaction_key: formData.authorize_transaction_key_sandbox || ''
                };
                configuration.production = {
                    login_id: formData.authorize_login_id_production || '',
                    transaction_key: formData.authorize_transaction_key_production || ''
                };
            } else {
                configuration.sandbox = {
                    client_key: formData.client_key_sandbox || '',
                    client_secret: formData.client_secret_sandbox || ''
                };
                configuration.production = {
                    client_key: formData.client_key_production || '',
                    client_secret: formData.client_secret_production || ''
                };
            }

            await updatePartnerPaymentProviderConfig({
                payment_provider_id: provider.id,
                status: true,
                is_default: isDefault,
                configuration: configuration
            });
            toast.success(`${provider.name} configuration saved successfully!`);
            queryClient.invalidateQueries({ queryKey: ['globalConfigurations'] });
        } catch (error: any) {
            console.error(`Failed to save ${provider.name} config:`, error);
            toast.error(error.response?.data?.message || 'Failed to save configuration.');
        } finally {
            setLoading(false);
        }
    };

    const isSandbox = formData.payment_mode !== 'production';
    const suffix = isSandbox ? '_sandbox' : '_production';
    const providerLogo = getProviderLogo(provider.name, provider.slug);

    return (
        <div className="card shadow-sm border-0 payment-method-card animate__animated animate__fadeIn">
            <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                <div>
                    <h5 className="card-title mb-0 fs-15 text-dark fw-semibold">{provider.name} Integration</h5>
                    <p className="text-muted mb-0 fs-13">Securely configure your {provider.name} payment credentials</p>
                </div>
            </div>
            <div className="card-body p-4">
                {fetching ? (
                    <StripeConfigSkeleton />
                ) : (
                    <>
                        <div className="d-flex align-items-center bg-info-subtle rounded-3 p-3 mb-4">
                            <div className="flex-shrink-0 me-4">
                                <img src={providerLogo} alt={`${provider.name} Logo`} style={{ height: '35px' }} />
                            </div>
                            <div className="flex-grow-1">
                                <h6 className="mb-1 text-dark fw-semibold fs-14">{provider.name} Settings</h6>
                                <p className="text-muted mb-0 fs-13">
                                    Configure credentials for testing and live production environments. Ensure your keys are correct before enabling checkout options.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div>
                                {/* Environment Toggle */}
                                <div className="mb-4 bg-primary-subtle rounded-3 p-3">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div>
                                            <h6 className="mb-1 fw-bold fs-14">Operating Environment</h6>
                                            <p className="text-muted mb-0 fs-13">
                                                Currently configuring the <strong>{isSandbox ? 'Sandbox' : 'Production'}</strong> API credentials.
                                            </p>
                                        </div>
                                        <div>
                                            <Dropdown
                                                value={formData.payment_mode}
                                                options={[
                                                    { label: '🧪 Sandbox', value: 'sandbox' },
                                                    { label: '🚀 Production', value: 'production' }
                                                ]}
                                                onChange={(e: DropdownChangeEvent) => handleModeChangeRequest(e.value)}
                                                placeholder="Select Environment"
                                                className="w-100"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="row g-4 mt-2">
                                    {slug === 'stripe' && (
                                        <>
                                            {/* Stripe Publishable Key */}
                                            <div className="col-12">
                                                <div className="input-group">
                                                    <span className={`input-group-text ${errors[`stripe_key${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`} style={{ minWidth: '150px', justifyContent: 'center' }}>
                                                        Publishable Key
                                                    </span>
                                                    <input
                                                        type="text"
                                                        className={`form-control fs-14 ${errors[`stripe_key${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                        name={`stripe_key${suffix}`}
                                                        value={formData[`stripe_key${suffix}`] || ''}
                                                        onChange={handleInputChange}
                                                        placeholder={isSandbox ? "pk_test_..." : "pk_live_..."}
                                                        style={{ boxShadow: 'none' }}
                                                        autoComplete="new-password"
                                                    />
                                                    {errors[`stripe_key${suffix}`] && (
                                                        <div className="invalid-feedback ps-3 pb-2">
                                                            <i className="ri-error-warning-line me-1"></i>{errors[`stripe_key${suffix}`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stripe Secret Key */}
                                            <div className="col-12">
                                                <div className="input-group">
                                                    <span className={`input-group-text ${errors[`stripe_secret${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`} style={{ minWidth: '150px', justifyContent: 'center' }}>
                                                        Secret Key
                                                    </span>
                                                    <input
                                                        type="password"
                                                        className={`form-control fs-14 ${errors[`stripe_secret${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                        name={`stripe_secret${suffix}`}
                                                        value={formData[`stripe_secret${suffix}`] || ''}
                                                        onChange={handleInputChange}
                                                        placeholder={isSandbox ? "sk_test_..." : "sk_live_..."}
                                                        style={{ boxShadow: 'none' }}
                                                        autoComplete="new-password"
                                                    />
                                                    {errors[`stripe_secret${suffix}`] && (
                                                        <div className="invalid-feedback ps-3 pb-2">
                                                            <i className="ri-error-warning-line me-1"></i>{errors[`stripe_secret${suffix}`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Partner Auto Charge Fee */}
                                            {user?.is_host == 0 && (
                                                <div className="col-12 mt-4">
                                                    <div className="p-3 border border-light-subtle rounded-3 bg-light bg-opacity-50">
                                                        <div className="d-flex align-items-center justify-content-between">
                                                            <div>
                                                                <h6 className="mb-1 fw-semibold fs-14 text-dark">
                                                                    Host Fee Auto Deduction
                                                                </h6>
                                                                <p className="text-muted mb-0 fs-13">
                                                                    Automatically transfer ${fixedEnrollmentAmount} from the partner account to the host account upon successful transactions.
                                                                </p>
                                                            </div>
                                                            <div className="flex-shrink-0 ms-3">
                                                                <div className="form-check form-switch form-switch-md mb-0" dir="ltr">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="form-check-input"
                                                                        id="partner_auto_charge_host_fee"
                                                                        name="partner_auto_charge_host_fee"
                                                                        checked={!!formData.partner_auto_charge_host_fee}
                                                                        onChange={handleCheckboxChange}
                                                                        disabled={loading}
                                                                        style={{ cursor: 'pointer' }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {slug === 'square' && (
                                        <>
                                            {/* Square App ID */}
                                            <div className="col-12">
                                                <div className="input-group">
                                                    <span className={`input-group-text ${errors[`square_app_id${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`} style={{ minWidth: '150px', justifyContent: 'center' }}>
                                                        Application ID
                                                    </span>
                                                    <input
                                                        type="text"
                                                        className={`form-control fs-14 ${errors[`square_app_id${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                        name={`square_app_id${suffix}`}
                                                        value={formData[`square_app_id${suffix}`] || ''}
                                                        onChange={handleInputChange}
                                                        placeholder={isSandbox ? "sandbox-sq-app-id-..." : "sq-app-id-..."}
                                                        style={{ boxShadow: 'none' }}
                                                        autoComplete="new-password"
                                                    />
                                                    {errors[`square_app_id${suffix}`] && (
                                                        <div className="invalid-feedback ps-3 pb-2">
                                                            <i className="ri-error-warning-line me-1"></i>{errors[`square_app_id${suffix}`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Square Access Token */}
                                            <div className="col-12">
                                                <div className="input-group">
                                                    <span className={`input-group-text ${errors[`square_token${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`} style={{ minWidth: '150px', justifyContent: 'center' }}>
                                                        Access Token
                                                    </span>
                                                    <input
                                                        type="password"
                                                        className={`form-control fs-14 ${errors[`square_token${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                        name={`square_token${suffix}`}
                                                        value={formData[`square_token${suffix}`] || ''}
                                                        onChange={handleInputChange}
                                                        placeholder={isSandbox ? "EAAAEO..." : "EAAAE..."}
                                                        style={{ boxShadow: 'none' }}
                                                        autoComplete="new-password"
                                                    />
                                                    {errors[`square_token${suffix}`] && (
                                                        <div className="invalid-feedback ps-3 pb-2">
                                                            <i className="ri-error-warning-line me-1"></i>{errors[`square_token${suffix}`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {(slug === 'authorizenet' || slug === 'authorize') && (
                                        <>
                                            {/* Authorize Login ID */}
                                            <div className="col-12">
                                                <div className="input-group">
                                                    <span className={`input-group-text ${errors[`authorize_login_id${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`} style={{ minWidth: '150px', justifyContent: 'center' }}>
                                                        API Login ID
                                                    </span>
                                                    <input
                                                        type="text"
                                                        className={`form-control fs-14 ${errors[`authorize_login_id${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                        name={`authorize_login_id${suffix}`}
                                                        value={formData[`authorize_login_id${suffix}`] || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter API Login ID"
                                                        style={{ boxShadow: 'none' }}
                                                        autoComplete="new-password"
                                                    />
                                                    {errors[`authorize_login_id${suffix}`] && (
                                                        <div className="invalid-feedback ps-3 pb-2">
                                                            <i className="ri-error-warning-line me-1"></i>{errors[`authorize_login_id${suffix}`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Authorize Transaction Key */}
                                            <div className="col-12">
                                                <div className="input-group">
                                                    <span className={`input-group-text ${errors[`authorize_transaction_key${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`} style={{ minWidth: '150px', justifyContent: 'center' }}>
                                                        Transaction Key
                                                    </span>
                                                    <input
                                                        type="password"
                                                        className={`form-control fs-14 ${errors[`authorize_transaction_key${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                        name={`authorize_transaction_key${suffix}`}
                                                        value={formData[`authorize_transaction_key${suffix}`] || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter Transaction Key"
                                                        style={{ boxShadow: 'none' }}
                                                        autoComplete="new-password"
                                                    />
                                                    {errors[`authorize_transaction_key${suffix}`] && (
                                                        <div className="invalid-feedback ps-3 pb-2">
                                                            <i className="ri-error-warning-line me-1"></i>{errors[`authorize_transaction_key${suffix}`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {slug !== 'stripe' && slug !== 'square' && slug !== 'authorizenet' && slug !== 'authorize' && (
                                        <>
                                            {/* Default Gateway Client Key */}
                                            <div className="col-12">
                                                <div className="input-group">
                                                    <span className={`input-group-text ${errors[`client_key${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`} style={{ minWidth: '150px', justifyContent: 'center' }}>
                                                        Client Key
                                                    </span>
                                                    <input
                                                        type="text"
                                                        className={`form-control fs-14 ${errors[`client_key${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                        name={`client_key${suffix}`}
                                                        value={formData[`client_key${suffix}`] || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter Client Key"
                                                        style={{ boxShadow: 'none' }}
                                                        autoComplete="new-password"
                                                    />
                                                    {errors[`client_key${suffix}`] && (
                                                        <div className="invalid-feedback ps-3 pb-2">
                                                            <i className="ri-error-warning-line me-1"></i>{errors[`client_key${suffix}`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Default Gateway Client Secret */}
                                            <div className="col-12">
                                                <div className="input-group">
                                                    <span className={`input-group-text ${errors[`client_secret${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`} style={{ minWidth: '150px', justifyContent: 'center' }}>
                                                        Client Secret
                                                    </span>
                                                    <input
                                                        type="password"
                                                        className={`form-control fs-14 ${errors[`client_secret${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                        name={`client_secret${suffix}`}
                                                        value={formData[`client_secret${suffix}`] || ''}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter Client Secret"
                                                        style={{ boxShadow: 'none' }}
                                                        autoComplete="new-password"
                                                    />
                                                    {errors[`client_secret${suffix}`] && (
                                                        <div className="invalid-feedback ps-3 pb-2">
                                                            <i className="ri-error-warning-line me-1"></i>{errors[`client_secret${suffix}`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="col-12 mt-5 pt-3 border-top">
                                    <div className="d-flex justify-content-end gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-light px-4 py-2 fw-medium payment-method-btn-round"
                                            onClick={onBack}
                                            disabled={loading}
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary px-4 py-2 fw-medium d-flex align-items-center gap-2 payment-method-btn-round"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                    <span>Saving Configuration...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <i className="ri-checkbox-circle-line fs-16"></i>
                                                    <span>Save Configuration</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </>
                )}
            </div>

            <DynamicActionModal
                show={showModal}
                title="Confirm Environment Change"
                description={
                    <>
                        You are about to switch the payment environment to <strong>{pendingMode === 'production' ? 'Production' : 'Sandbox'}</strong>.
                    </>
                }
                warningText={`Switching to Production will use live ${provider.name} keys. Real transactions will be processed if this is used in checkout.`}
                warningBgClass={pendingMode === 'production'
                    ? 'bg-danger-subtle border-start border-3 border-danger'
                    : 'bg-info-subtle border-start border-3 border-info'
                }
                imgSrc={providerLogo}
                confirmText={`Yes, Change to ${pendingMode === 'production' ? 'Production' : 'Sandbox'}`}
                confirmBtnClass={pendingMode === 'production' ? 'btn-danger' : 'btn-primary'}
                onClose={cancelModeChange}
                onConfirm={confirmModeChange}
            />
        </div>
    );
}
