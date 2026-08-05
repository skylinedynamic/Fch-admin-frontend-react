import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchPartnerPaymentProviderConfig, updatePartnerPaymentProviderConfig, updatePartnerPaymentProviderStatus } from '../../../../modules/settings/services';
import type { PartnerPaymentProvider } from '../../../../modules/settings/services';
import { StripeConfigSkeleton } from '../../../../components/Loader/SpecificSkeletons';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import DynamicActionModal from '../../../../components/Common/Modals/DynamicActionModal';
import PaymentMethodStatusModal from '../../../../components/Common/Modals/PaymentMethodStatusModal';
import { useAuthStore } from '../../../../store/auth/authStore';
import { apiClient } from '../../../../lib/http/apiClient';
import { PAYMENT_METHOD_PROVIDER, PAYMENT_ENVIRONMENT_LABELS } from '../../../../config/paymentConfig';

const MODE_SANDBOX = PAYMENT_ENVIRONMENT_LABELS[0].toLowerCase();
const MODE_PRODUCTION = PAYMENT_ENVIRONMENT_LABELS[1].toLowerCase();

const PROVIDER_STRIPE = PAYMENT_METHOD_PROVIDER[1];
const PROVIDER_SQUARE = PAYMENT_METHOD_PROVIDER[2];
const PROVIDER_ECRYPT = PAYMENT_METHOD_PROVIDER[3];
const PROVIDER_AUTHORIZE = PAYMENT_METHOD_PROVIDER[4];
const PROVIDER_CASH = PAYMENT_METHOD_PROVIDER[5];
const PROVIDER_BANK = PAYMENT_METHOD_PROVIDER[6];

interface PaymentMethodConfigFormProps {
    provider: PartnerPaymentProvider;
    onBack: () => void;
}

interface FormErrors {
    [key: string]: string | null;
}

export default function PaymentMethodConfigForm({ provider, onBack }: PaymentMethodConfigFormProps): React.JSX.Element {
    const user = useAuthStore((state: any) => state.user);
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState<boolean>(false);
    const [fetching, setFetching] = useState<boolean>(true);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [pendingMode, setPendingMode] = useState<string | null>(null);
    const [isDefault, setIsDefault] = useState<boolean>(false);
    const [linkageId, setLinkageId] = useState<number | null>(null);
    const [status, setStatus] = useState<boolean>(false);
    const [toggling, setToggling] = useState<boolean>(false);
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

    const handleStatusToggleConfirm = async () => {
        const newStatus = !status;
        setToggling(true);
        try {
            await updatePartnerPaymentProviderStatus({
                payment_provider_id: provider.id,
                status: newStatus
            });
            setStatus(newStatus);
            toast.success(`${provider.name} status updated successfully.`);
            queryClient.invalidateQueries({ queryKey: ['globalConfigurations'] });
            setShowConfirmModal(false);
        } catch (error) {
            console.error('Error updating provider status:', error);
            toast.error(`Failed to update ${provider.name} status.`);
        } finally {
            setToggling(false);
        }
    };

    // Dynamic config form state containing keys for whichever provider is configured
    const [formData, setFormData] = useState<Record<string, any>>({
        payment_mode: MODE_SANDBOX
    });

    const [errors, setErrors] = useState<FormErrors>({});

    const name = provider.name;

    const isStripe = name === PROVIDER_STRIPE;
    const isSquare = name === PROVIDER_SQUARE;
    const isAuthorize = name === PROVIDER_AUTHORIZE;
    const isEcrypt = name === PROVIDER_ECRYPT;
    const isCash = name === PROVIDER_CASH;
    const isBank = name === PROVIDER_BANK;
    const isFallback = !isStripe && !isSquare && !isAuthorize && !isEcrypt && !isCash && !isBank;

    useEffect(() => {
        loadConfig();
    }, [provider.id]);


    const loadConfig = async () => {
        try {
            setFetching(true);
            const response = await fetchPartnerPaymentProviderConfig(provider.id);
            if (response && response.status && response.data) {
                const linkage = response.data;
                setLinkageId(linkage.id || null);
                setIsDefault(!!linkage.is_default);
                setStatus(!!linkage.status);
                const config = linkage.configuration || {};
                const paymentMode = linkage.payment_mode || config.payment_mode || MODE_SANDBOX;

                // Initialize fields depending on payment gateway type
                if (isStripe) {
                    setFormData({
                        stripe_key_sandbox: config.sandbox?.publishable_key || config.stripe_key_sandbox || '',
                        stripe_secret_sandbox: config.sandbox?.secret_key || config.stripe_secret_sandbox || '',
                        stripe_key_production: config.production?.publishable_key || config.stripe_key_production || '',
                        stripe_secret_production: config.production?.secret_key || config.stripe_secret_production || '',
                        payment_mode: paymentMode
                    });
                }
                if (isSquare) {
                    setFormData({
                        square_app_id_sandbox: config.sandbox?.app_id || config.square_app_id_sandbox || '',
                        square_token_sandbox: config.sandbox?.access_token || config.square_token_sandbox || '',
                        square_app_id_production: config.production?.app_id || config.square_app_id_production || '',
                        square_token_production: config.production?.access_token || config.square_token_production || '',
                        payment_mode: paymentMode
                    });
                }
                if (isAuthorize) {
                    setFormData({
                        authorize_login_id_sandbox: config.sandbox?.login_id || config.authorize_login_id_sandbox || '',
                        authorize_transaction_key_sandbox: config.sandbox?.transaction_key || config.authorize_transaction_key_sandbox || '',
                        authorize_login_id_production: config.production?.login_id || config.authorize_login_id_production || '',
                        authorize_transaction_key_production: config.production?.transaction_key || config.authorize_transaction_key_production || '',
                        payment_mode: paymentMode
                    });
                }
                if (isEcrypt || isFallback) {
                    setFormData({
                        client_key_sandbox: config.sandbox?.client_key || config.client_key_sandbox || '',
                        client_secret_sandbox: config.sandbox?.client_secret || config.client_secret_sandbox || '',
                        client_key_production: config.production?.client_key || config.client_key_production || '',
                        client_secret_production: config.production?.client_secret || config.client_secret_production || '',
                        payment_mode: paymentMode
                    });
                }
                if (isCash) {
                    setFormData({
                        payment_mode: paymentMode
                    });
                }
                if (isBank) {
                    const sandboxBank1 = config.sandbox?.bank_1 || {};
                    const sandboxBank2 = config.sandbox?.bank_2 || {};
                    const sBank1Name = sandboxBank1.bank_name || config.sandbox?.bank_name || '';
                    const sBank1AccName = sandboxBank1.account_name || config.sandbox?.account_name || '';
                    const sBank1Route = sandboxBank1.routing_number || config.sandbox?.routing_number || '';
                    const sBank1AccNum = sandboxBank1.account_number || config.sandbox?.account_number || '';
                    const sBank1Instr = sandboxBank1.instructions || config.sandbox?.instructions || '';

                    const productionBank1 = config.production?.bank_1 || {};
                    const productionBank2 = config.production?.bank_2 || {};
                    const pBank1Name = productionBank1.bank_name || config.production?.bank_name || '';
                    const pBank1AccName = productionBank1.account_name || config.production?.account_name || '';
                    const pBank1Route = productionBank1.routing_number || config.production?.routing_number || '';
                    const pBank1AccNum = productionBank1.account_number || config.production?.account_number || '';
                    const pBank1Instr = productionBank1.instructions || config.production?.instructions || '';

                    setFormData({
                        bank_name_1_sandbox: sBank1Name,
                        account_name_1_sandbox: sBank1AccName,
                        routing_number_1_sandbox: sBank1Route,
                        account_number_1_sandbox: sBank1AccNum,
                        instructions_1_sandbox: sBank1Instr,

                        bank_name_2_sandbox: sandboxBank2.bank_name || '',
                        account_name_2_sandbox: sandboxBank2.account_name || '',
                        routing_number_2_sandbox: sandboxBank2.routing_number || '',
                        account_number_2_sandbox: sandboxBank2.account_number || '',
                        instructions_2_sandbox: sandboxBank2.instructions || '',

                        bank_name_1_production: pBank1Name,
                        account_name_1_production: pBank1AccName,
                        routing_number_1_production: pBank1Route,
                        account_number_1_production: pBank1AccNum,
                        instructions_1_production: pBank1Instr,

                        bank_name_2_production: productionBank2.bank_name || '',
                        account_name_2_production: productionBank2.account_name || '',
                        routing_number_2_production: productionBank2.routing_number || '',
                        account_number_2_production: productionBank2.account_number || '',
                        instructions_2_production: productionBank2.instructions || '',

                        payment_mode: paymentMode
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
        const mode = formData.payment_mode || MODE_SANDBOX;
        const suffix = `_${mode}`;

        if (isStripe) {
            if (!formData[`stripe_key${suffix}`]) {
                newErrors[`stripe_key${suffix}`] = 'Stripe Publishable Key is required.';
            }
            if (!formData[`stripe_secret${suffix}`]) {
                newErrors[`stripe_secret${suffix}`] = 'Stripe Secret Key is required.';
            }
        }
        if (isSquare) {
            if (!formData[`square_app_id${suffix}`]) {
                newErrors[`square_app_id${suffix}`] = 'Square Application ID is required.';
            }
            if (!formData[`square_token${suffix}`]) {
                newErrors[`square_token${suffix}`] = 'Square Access Token is required.';
            }
        }
        if (isAuthorize) {
            if (!formData[`authorize_login_id${suffix}`]) {
                newErrors[`authorize_login_id${suffix}`] = 'Authorize.Net API Login ID is required.';
            }
            if (!formData[`authorize_transaction_key${suffix}`]) {
                newErrors[`authorize_transaction_key${suffix}`] = 'Authorize.Net Transaction Key is required.';
            }
        }
        if (isEcrypt || isFallback) {
            if (!formData[`client_key${suffix}`]) {
                newErrors[`client_key${suffix}`] = 'Client Key is required.';
            }
            if (!formData[`client_secret${suffix}`]) {
                newErrors[`client_secret${suffix}`] = 'Client Secret is required.';
            }
        }
        if (isBank) {
            if (!formData[`bank_name_1${suffix}`]) {
                newErrors[`bank_name_1${suffix}`] = 'Bank Name is required.';
            }
            if (!formData[`account_name_1${suffix}`]) {
                newErrors[`account_name_1${suffix}`] = 'Account Holder Name is required.';
            }
            if (!formData[`account_number_1${suffix}`]) {
                newErrors[`account_number_1${suffix}`] = 'Account Number is required.';
            }

            const hasAnyBank2Field =
                formData[`bank_name_2${suffix}`] ||
                formData[`account_name_2${suffix}`] ||
                formData[`account_number_2${suffix}`] ||
                formData[`routing_number_2${suffix}`] ||
                formData[`instructions_2${suffix}`];

            if (hasAnyBank2Field) {
                if (!formData[`bank_name_2${suffix}`]) {
                    newErrors[`bank_name_2${suffix}`] = 'Bank Name is required.';
                }
                if (!formData[`account_name_2${suffix}`]) {
                    newErrors[`account_name_2${suffix}`] = 'Account Holder Name is required.';
                }
                if (!formData[`account_number_2${suffix}`]) {
                    newErrors[`account_number_2${suffix}`] = 'Account Number is required.';
                }
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
            // Prepare configuration with only the nested keys for environment
            let configuration: Record<string, any> = {};
            if (isStripe) {
                configuration = {
                    sandbox: {
                        publishable_key: formData.stripe_key_sandbox || null,
                        secret_key: formData.stripe_secret_sandbox || null
                    },
                    production: {
                        publishable_key: formData.stripe_key_production || null,
                        secret_key: formData.stripe_secret_production || null
                    }
                };
            } else if (isSquare) {
                configuration = {
                    sandbox: {
                        app_id: formData.square_app_id_sandbox || null,
                        access_token: formData.square_token_sandbox || null
                    },
                    production: {
                        app_id: formData.square_app_id_production || null,
                        access_token: formData.square_token_production || null
                    }
                };
            } else if (isAuthorize) {
                configuration = {
                    sandbox: {
                        login_id: formData.authorize_login_id_sandbox || null,
                        transaction_key: formData.authorize_transaction_key_sandbox || null
                    },
                    production: {
                        login_id: formData.authorize_login_id_production || null,
                        transaction_key: formData.authorize_transaction_key_production || null
                    }
                };
            } else if (isCash) {
                configuration = {};
            } else if (isBank) {
                configuration = {
                    sandbox: {
                        bank_1: {
                            bank_name: formData.bank_name_1_sandbox || null,
                            account_name: formData.account_name_1_sandbox || null,
                            routing_number: formData.routing_number_1_sandbox || null,
                            account_number: formData.account_number_1_sandbox || null,
                            instructions: formData.instructions_1_sandbox || null
                        },
                        bank_2: {
                            bank_name: formData.bank_name_2_sandbox || null,
                            account_name: formData.account_name_2_sandbox || null,
                            routing_number: formData.routing_number_2_sandbox || null,
                            account_number: formData.account_number_2_sandbox || null,
                            instructions: formData.instructions_2_sandbox || null
                        }
                    },
                    production: {
                        bank_1: {
                            bank_name: formData.bank_name_1_production || null,
                            account_name: formData.account_name_1_production || null,
                            routing_number: formData.routing_number_1_production || null,
                            account_number: formData.account_number_1_production || null,
                            instructions: formData.instructions_1_production || null
                        },
                        bank_2: {
                            bank_name: formData.bank_name_2_production || null,
                            account_name: formData.account_name_2_production || null,
                            routing_number: formData.routing_number_2_production || null,
                            account_number: formData.account_number_2_production || null,
                            instructions: formData.instructions_2_production || null
                        }
                    }
                };
            } else {
                configuration = {
                    sandbox: {
                        client_key: formData.client_key_sandbox || null,
                        client_secret: formData.client_secret_sandbox || null
                    },
                    production: {
                        client_key: formData.client_key_production || null,
                        client_secret: formData.client_secret_production || null
                    }
                };
            }

            await updatePartnerPaymentProviderConfig({
                id: linkageId,
                payment_provider_id: provider.id,
                payment_mode: formData.payment_mode || MODE_SANDBOX,
                status: status,
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

    const isSandbox = formData.payment_mode !== MODE_PRODUCTION;
    const suffix = `_${isSandbox ? MODE_SANDBOX : MODE_PRODUCTION}`;

    return (
        <div className="card shadow-sm border-0 payment-method-card animate__animated animate__fadeIn">
            <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                <div>
                    <h5 className="card-title mb-0 fs-15 text-dark fw-semibold">{provider.name} Integration</h5>
                    <p className="text-muted mb-0 fs-13">Securely configure your {provider.name} payment credentials</p>
                </div>
            </div>
            <div className="card-body p-3 p-sm-4">
                {fetching ? (
                    <StripeConfigSkeleton />
                ) : (
                    <>
                        <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center bg-info-subtle rounded-3 p-3 mb-4 gap-3">
                            <div className="flex-shrink-0">
                                <img src={provider.logo || ''} alt={`${provider.name} Logo`} style={{ height: '35px', maxWidth: '80px', objectFit: 'contain' }} />
                            </div>
                            <div className="flex-grow-1">
                                <h6 className="mb-1 text-dark fw-semibold fs-14">{provider.name} Settings</h6>
                                <p className="text-muted mb-0 fs-13">
                                    Configure credentials for testing and live production environments. Ensure your keys are correct before enabling checkout options.
                                </p>
                            </div>
                        </div>

                        {/* Active Status Toggle Section */}
                        <div className={`mb-4 rounded-3 p-3 animate__animated animate__fadeIn transition-all ${status ? 'bg-success-subtle border-success-subtle' : 'bg-danger-subtle border-danger-subtle'}`}>
                            <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2">
                                <div>
                                    <h6 className={`mb-1 fw-bold fs-14 ${status ? 'text-success' : 'text-danger'}`}>Active Status</h6>
                                    <p className="text-muted mb-0 fs-13">
                                        Enable or disable this payment method for checkout integration.
                                    </p>
                                </div>
                                <div className="form-check form-switch form-switch-lg custom-switch-primary m-0 d-flex align-items-center gap-2 flex-shrink-0">
                                    <input
                                        className="form-check-input cursor-pointer payment-method-switch"
                                        type="checkbox"
                                        role="switch"
                                        id={`provider-form-status-${provider.id}`}
                                        checked={status}
                                        onChange={() => setShowConfirmModal(true)}
                                        disabled={toggling || loading}
                                    />
                                    <label className={`form-check-label fs-13 fw-semibold ${status ? 'text-success' : 'text-danger'}`} htmlFor={`provider-form-status-${provider.id}`}>
                                        {status ? 'Active' : 'Inactive'}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div
                                className={`rounded-3 transition-all`}
                            >
                                {!status && (
                                    <div className="alert alert-secondary border-0 d-flex align-items-center gap-2 mb-4 animate__animated animate__fadeIn" style={{ background: 'rgba(0,0,0,0.05)' }}>
                                        <i className="ri-information-line fs-18 text-secondary"></i>
                                        <span className="fs-13 text-secondary">This integration is currently inactive. Toggle <strong>Active Status</strong> above to enable editing.</span>
                                    </div>
                                )}
                                {/* Environment Toggle */}
                                <div className="mb-4 bg-primary-subtle rounded-3 p-3">
                                    <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2">
                                        <div>
                                            <h6 className="mb-1 fw-bold fs-14">Operating Environment</h6>
                                            <p className="text-muted mb-0 fs-13">
                                                Currently configuring the <strong>{isSandbox ? PAYMENT_ENVIRONMENT_LABELS[0] : PAYMENT_ENVIRONMENT_LABELS[1]}</strong> API credentials.
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0" style={{ minWidth: '170px', width: '100%', maxWidth: '220px' }}>
                                            <Dropdown
                                                value={formData.payment_mode}
                                                options={[
                                                    { label: `🧪 ${PAYMENT_ENVIRONMENT_LABELS[0]}`, value: MODE_SANDBOX },
                                                    { label: `🚀 ${PAYMENT_ENVIRONMENT_LABELS[1]}`, value: MODE_PRODUCTION }
                                                ]}
                                                onChange={(e: DropdownChangeEvent) => handleModeChangeRequest(e.value)}
                                                placeholder="Select Environment"
                                                className="w-100"
                                                disabled={loading || toggling || !status}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="row g-4 mt-2">
                                    {isStripe && (
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
                                                        disabled={loading || toggling || !status}
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
                                                        disabled={loading || toggling || !status}
                                                    />
                                                    {errors[`stripe_secret${suffix}`] && (
                                                        <div className="invalid-feedback ps-3 pb-2">
                                                            <i className="ri-error-warning-line me-1"></i>{errors[`stripe_secret${suffix}`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {isSquare && (
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
                                                        disabled={loading || toggling || !status}
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
                                                        disabled={loading || toggling || !status}
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

                                    {isAuthorize && (
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
                                                        disabled={loading || toggling || !status}
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
                                                        disabled={loading || toggling || !status}
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

                                    {(isEcrypt || isFallback) && (
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
                                                        disabled={loading || toggling || !status}
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
                                                        disabled={loading || toggling || !status}
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

                                    {isCash && (
                                        <div className="col-12 animate__animated animate__fadeIn">
                                            <div className="alert alert-info bg-info-subtle border-0 text-dark p-3.5 rounded-3 d-flex align-items-start gap-3 shadow-xs">
                                                <i className="ri-information-fill fs-20 text-info mt-0.5"></i>
                                                <div>
                                                    <h6 className="fw-semibold text-dark fs-14 mb-1">Cash Payment Integration</h6>
                                                    <p className="text-muted mb-0 fs-13 lh-base">
                                                        No API credentials or external keys are required. Toggle the <strong>Active Status</strong> above to make this payment method available for customers during checkout.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {isBank && (
                                        <div className="col-12 animate__animated animate__fadeIn">
                                            <div className="row g-4">
                                                {/* Bank Account 1 */}
                                                <div className="col-12 col-lg-6">
                                                    <div className="payment-config-card">
                                                        <div className="payment-config-card-header d-flex align-items-center gap-2">
                                                            <div className="payment-config-icon-wrapper primary">
                                                                <i className="ri-bank-line fs-14"></i>
                                                            </div>
                                                            <span className="payment-config-card-title">Bank Account 1 (Primary)</span>
                                                        </div>
                                                        <div className="payment-config-card-body">
                                                            <div className="row g-3">
                                                                {/* Bank Name 1 */}
                                                                <div className="col-12">
                                                                    <div className="input-group payment-config-input-group">
                                                                        <span className={`input-group-text ${errors[`bank_name_1${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
                                                                            Bank Name
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            className={`form-control fs-14 ${errors[`bank_name_1${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                                            name={`bank_name_1${suffix}`}
                                                                            value={formData[`bank_name_1${suffix}`] || ''}
                                                                            onChange={handleInputChange}
                                                                            placeholder="e.g. Chase Bank"
                                                                            disabled={loading || toggling || !status}
                                                                        />
                                                                        {errors[`bank_name_1${suffix}`] && (
                                                                            <div className="invalid-feedback ps-3 pb-2">
                                                                                <i className="ri-error-warning-line me-1"></i>{errors[`bank_name_1${suffix}`]}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Account Name 1 */}
                                                                <div className="col-12">
                                                                    <div className="input-group payment-config-input-group">
                                                                        <span className={`input-group-text ${errors[`account_name_1${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
                                                                            Account Name
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            className={`form-control fs-14 ${errors[`account_name_1${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                                            name={`account_name_1${suffix}`}
                                                                            value={formData[`account_name_1${suffix}`] || ''}
                                                                            onChange={handleInputChange}
                                                                            placeholder="Account Holder Name"
                                                                            disabled={loading || toggling || !status}
                                                                        />
                                                                        {errors[`account_name_1${suffix}`] && (
                                                                            <div className="invalid-feedback ps-3 pb-2">
                                                                                <i className="ri-error-warning-line me-1"></i>{errors[`account_name_1${suffix}`]}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Account Number 1 */}
                                                                <div className="col-12">
                                                                    <div className="input-group payment-config-input-group">
                                                                        <span className={`input-group-text ${errors[`account_number_1${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
                                                                            Account Number
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            className={`form-control fs-14 ${errors[`account_number_1${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                                            name={`account_number_1${suffix}`}
                                                                            value={formData[`account_number_1${suffix}`] || ''}
                                                                            onChange={handleInputChange}
                                                                            placeholder="Bank Account Number"
                                                                            disabled={loading || toggling || !status}
                                                                        />
                                                                        {errors[`account_number_1${suffix}`] && (
                                                                            <div className="invalid-feedback ps-3 pb-2">
                                                                                <i className="ri-error-warning-line me-1"></i>{errors[`account_number_1${suffix}`]}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Routing Number 1 */}
                                                                <div className="col-12">
                                                                    <div className="input-group payment-config-input-group">
                                                                        <span className="input-group-text bg-light text-muted">
                                                                            Routing Number
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control fs-14"
                                                                            name={`routing_number_1${suffix}`}
                                                                            value={formData[`routing_number_1${suffix}`] || ''}
                                                                            onChange={handleInputChange}
                                                                            placeholder="Routing / ABA Number"
                                                                            disabled={loading || toggling || !status}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Instructions 1 */}
                                                                <div className="col-12">
                                                                    <div className="input-group payment-config-input-group">
                                                                        <span className="input-group-text bg-light text-muted">
                                                                            Instructions
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control fs-14"
                                                                            name={`instructions_1${suffix}`}
                                                                            value={formData[`instructions_1${suffix}`] || ''}
                                                                            onChange={handleInputChange}
                                                                            placeholder="Instructions or Swift/BIC codes for Account 1"
                                                                            disabled={loading || toggling || !status}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bank Account 2 */}
                                                <div className="col-12 col-lg-6">
                                                    <div className="payment-config-card">
                                                        <div className="payment-config-card-header d-flex align-items-center justify-content-between">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="payment-config-icon-wrapper secondary">
                                                                    <i className="ri-bank-line fs-14"></i>
                                                                </div>
                                                                <span className="payment-config-card-title">Bank Account 2 (Optional)</span>
                                                            </div>
                                                            <span className="badge bg-light text-muted border rounded-pill px-2.5 py-0.5 fs-10 fw-normal">Optional</span>
                                                        </div>
                                                        <div className="payment-config-card-body">
                                                            <div className="row g-3">
                                                                {/* Bank Name 2 */}
                                                                <div className="col-12">
                                                                    <div className="input-group payment-config-input-group">
                                                                        <span className={`input-group-text ${errors[`bank_name_2${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
                                                                            Bank Name
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            className={`form-control fs-14 ${errors[`bank_name_2${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                                            name={`bank_name_2${suffix}`}
                                                                            value={formData[`bank_name_2${suffix}`] || ''}
                                                                            onChange={handleInputChange}
                                                                            placeholder="e.g. Wells Fargo"
                                                                            disabled={loading || toggling || !status}
                                                                        />
                                                                        {errors[`bank_name_2${suffix}`] && (
                                                                            <div className="invalid-feedback ps-3 pb-2">
                                                                                <i className="ri-error-warning-line me-1"></i>{errors[`bank_name_2${suffix}`]}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Account Name 2 */}
                                                                <div className="col-12">
                                                                    <div className="input-group payment-config-input-group">
                                                                        <span className={`input-group-text ${errors[`account_name_2${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
                                                                            Account Name
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            className={`form-control fs-14 ${errors[`account_name_2${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                                            name={`account_name_2${suffix}`}
                                                                            value={formData[`account_name_2${suffix}`] || ''}
                                                                            onChange={handleInputChange}
                                                                            placeholder="Account Holder Name"
                                                                            disabled={loading || toggling || !status}
                                                                        />
                                                                        {errors[`account_name_2${suffix}`] && (
                                                                            <div className="invalid-feedback ps-3 pb-2">
                                                                                <i className="ri-error-warning-line me-1"></i>{errors[`account_name_2${suffix}`]}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Account Number 2 */}
                                                                <div className="col-12">
                                                                    <div className="input-group payment-config-input-group">
                                                                        <span className={`input-group-text ${errors[`account_number_2${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
                                                                            Account Number
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            className={`form-control fs-14 ${errors[`account_number_2${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                                            name={`account_number_2${suffix}`}
                                                                            value={formData[`account_number_2${suffix}`] || ''}
                                                                            onChange={handleInputChange}
                                                                            placeholder="Bank Account Number"
                                                                            disabled={loading || toggling || !status}
                                                                        />
                                                                        {errors[`account_number_2${suffix}`] && (
                                                                            <div className="invalid-feedback ps-3 pb-2">
                                                                                <i className="ri-error-warning-line me-1"></i>{errors[`account_number_2${suffix}`]}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Routing Number 2 */}
                                                                <div className="col-12">
                                                                    <div className="input-group payment-config-input-group">
                                                                        <span className="input-group-text bg-light text-muted">
                                                                            Routing Number
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control fs-14"
                                                                            name={`routing_number_2${suffix}`}
                                                                            value={formData[`routing_number_2${suffix}`] || ''}
                                                                            onChange={handleInputChange}
                                                                            placeholder="Routing / ABA Number"
                                                                            disabled={loading || toggling || !status}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Instructions 2 */}
                                                                <div className="col-12">
                                                                    <div className="input-group payment-config-input-group">
                                                                        <span className="input-group-text bg-light text-muted">
                                                                            Instructions
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control fs-14"
                                                                            name={`instructions_2${suffix}`}
                                                                            value={formData[`instructions_2${suffix}`] || ''}
                                                                            onChange={handleInputChange}
                                                                            placeholder="Instructions or Swift/BIC codes for Account 2"
                                                                            disabled={loading || toggling || !status}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="row mt-5 pt-3 border-top">
                                    <div className="col-12">
                                        <div className="d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-light px-4 py-2 fw-medium payment-method-btn-round w-100 w-sm-auto d-flex align-items-center justify-content-center flex-nowrap text-nowrap gap-1"
                                                onClick={onBack}
                                                disabled={loading}
                                            >
                                                <i className="ri-arrow-left-line"></i> Back
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-primary px-4 py-2 fw-medium d-flex align-items-center justify-content-center flex-nowrap text-nowrap gap-2 payment-method-btn-round w-100 w-sm-auto"
                                                disabled={loading || toggling || !status}
                                            >
                                                {loading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                        <span>Saving...</span>
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
                        You are about to switch the payment environment to <strong>{pendingMode === MODE_PRODUCTION ? PAYMENT_ENVIRONMENT_LABELS[1] : PAYMENT_ENVIRONMENT_LABELS[0]}</strong>.
                    </>
                }
                warningText={`Switching to ${pendingMode === MODE_PRODUCTION ? PAYMENT_ENVIRONMENT_LABELS[1] : PAYMENT_ENVIRONMENT_LABELS[0]} will use live ${provider.name} keys. Real transactions will be processed if this is used in checkout.`}
                warningBgClass={pendingMode === MODE_PRODUCTION
                    ? 'bg-danger-subtle border-start border-3 border-danger'
                    : 'bg-info-subtle border-start border-3 border-info'
                }
                imgSrc={provider.logo || ''}
                confirmText={`Yes, Change to ${pendingMode === MODE_PRODUCTION ? PAYMENT_ENVIRONMENT_LABELS[1] : PAYMENT_ENVIRONMENT_LABELS[0]}`}
                confirmBtnClass={pendingMode === MODE_PRODUCTION ? 'btn-danger' : 'btn-primary'}
                onClose={cancelModeChange}
                onConfirm={confirmModeChange}
            />

            {/* Status Change Confirmation Modal */}
            <PaymentMethodStatusModal
                show={showConfirmModal}
                targetProvider={{ id: provider.id, name: provider.name, status: status }}
                updating={toggling}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleStatusToggleConfirm}
            />
        </div>
    );
}
