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
import { useConfigPartnerId } from '../../../../modules/settings/configPartner';
import { apiClient } from '../../../../lib/http/apiClient';
import { PAYMENT_METHOD_PROVIDER, PAYMENT_ENVIRONMENT_LABELS } from '../../../../config/paymentConfig';
import PaymentSetupAlert from './PaymentSetupAlert';

const MODE_SANDBOX = PAYMENT_ENVIRONMENT_LABELS[0].toLowerCase();
const MODE_PRODUCTION = PAYMENT_ENVIRONMENT_LABELS[1].toLowerCase();

const PROVIDER_STRIPE = PAYMENT_METHOD_PROVIDER[1];
const PROVIDER_SQUARE = PAYMENT_METHOD_PROVIDER[2];
const PROVIDER_ECRYPT = PAYMENT_METHOD_PROVIDER[3];
const PROVIDER_AUTHORIZE = PAYMENT_METHOD_PROVIDER[4];
const PROVIDER_CASH = PAYMENT_METHOD_PROVIDER[5];
const PROVIDER_BANK = PAYMENT_METHOD_PROVIDER[6];

/** A US routing (ABA) number is written as nine digits; the API checks it (App\Rules\RoutingNumber). */
const ROUTING_DIGITS = 9;
const BANK_FIELD_ERROR = /^bank_details\.(\d+)\.(\w+)$/;
// Stripe's answer when the keys are saved: configuration.<mode>.<key> -> the field in the form.
const STRIPE_FIELD_ERROR = /^configuration\.(sandbox|production)\.(publishable_key|secret_key)$/;
const STRIPE_FIELD: Record<string, string> = { publishable_key: 'stripe_key', secret_key: 'stripe_secret' };

interface PaymentMethodConfigFormProps {
    provider: PartnerPaymentProvider;
    onBack: () => void;
}

interface FormErrors {
    [key: string]: string | null;
}

export default function PaymentMethodConfigForm({ provider, onBack }: PaymentMethodConfigFormProps): React.JSX.Element {
    const user = useAuthStore((state: any) => state.user);
    // Partner profile › Configuration: that partner's provider settings; otherwise the user's own.
    const configPartnerId = useConfigPartnerId();
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
    // What the method is still missing, and whether payers can use it meanwhile, as the API last said.
    const [setupIssues, setSetupIssues] = useState<string[]>([]);
    const [canTakePayments, setCanTakePayments] = useState<boolean>(false);

    /** Takes the setup state from a details, save or status response, when it has one. */
    const applySetup = (linkage?: { setup_issues?: string[]; can_take_payments?: boolean } | null) => {
        if (Array.isArray(linkage?.setup_issues)) {
            setSetupIssues(linkage.setup_issues);
            // An API that doesn't say is treated as "payers can't use it".
            setCanTakePayments(linkage.can_take_payments === true);
        }
    };

    const handleStatusToggleConfirm = async () => {
        const newStatus = !status;
        setToggling(true);
        try {
            const response = await updatePartnerPaymentProviderStatus({
                payment_provider_id: provider.id,
                status: newStatus
            }, configPartnerId);
            if (response && response.status && response.data && response.data.id) {
                setLinkageId(response.data.id);
            }
            applySetup(response?.data);
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

    const [bankDetails, setBankDetails] = useState<any[]>([]);
    const [bankErrors, setBankErrors] = useState<Record<number, Record<string, string>>>({});

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
            const response = await fetchPartnerPaymentProviderConfig(provider.id, configPartnerId);
            if (response && response.status && response.data) {
                const linkage = response.data;
                setLinkageId(linkage.id || null);
                setIsDefault(!!linkage.is_default);
                setStatus(!!linkage.status);
                setSetupIssues([]);
                applySetup(linkage);
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
                    setBankDetails(linkage.bank_details || []);
                    setFormData({
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

    const handleBankDetailChange = (index: number, field: string, value: any) => {
        setBankDetails(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });

        // Clear error for this field
        if (bankErrors[index]?.[field]) {
            setBankErrors(prev => {
                const next = { ...prev };
                if (next[index]) {
                    const rowErrors = { ...next[index] };
                    delete rowErrors[field];
                    if (Object.keys(rowErrors).length === 0) {
                        delete next[index];
                    } else {
                        next[index] = rowErrors;
                    }
                }
                return next;
            });
        }
    };

    const addBankAccount = (mode: string) => {
        setBankDetails(prev => [
            ...prev,
            {
                id: null,
                bank_name: '',
                account_name: '',
                account_number: '',
                routing_number: '',
                instructions: '',
                payment_mode: mode,
                is_default: prev.filter(b => b.payment_mode === mode).length === 0,
                status: true
            }
        ]);
    };

    const deleteBankAccount = (index: number) => {
        setBankDetails(prev => {
            const updated = [...prev];
            const wasDefault = updated[index]?.is_default;
            const mode = updated[index]?.payment_mode;
            
            updated.splice(index, 1);
            
            if (wasDefault && updated.length > 0) {
                const firstRemainingIndex = updated.findIndex(b => b.payment_mode === mode);
                if (firstRemainingIndex !== -1) {
                    updated[firstRemainingIndex] = { ...updated[firstRemainingIndex], is_default: true };
                }
            }
            return updated;
        });
        
        setBankErrors(prev => {
            const next: Record<number, Record<string, string>> = {};
            Object.keys(prev).forEach(key => {
                const idx = parseInt(key, 10);
                if (idx < index) {
                    next[idx] = prev[idx];
                } else if (idx > index) {
                    next[idx - 1] = prev[idx];
                }
            });
            return next;
        });
    };

    const setDefaultBankAccount = (indexToSet: number) => {
        setBankDetails(prev => {
            const targetMode = prev[indexToSet]?.payment_mode;
            return prev.map((bank, index) => {
                if (bank.payment_mode === targetMode) {
                    return { ...bank, is_default: index === indexToSet };
                }
                return bank;
            });
        });
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
            const newBankErrors: Record<number, Record<string, string>> = {};
            let hasErrors = false;

            bankDetails.forEach((bank, index) => {
                const rowErrors: Record<string, string> = {};
                if (!bank.bank_name || !bank.bank_name.trim()) {
                    rowErrors.bank_name = 'Bank Name is required.';
                    hasErrors = true;
                }
                if (!bank.account_name || !bank.account_name.trim()) {
                    rowErrors.account_name = 'Account Holder Name is required.';
                    hasErrors = true;
                }
                if (!bank.account_number || !bank.account_number.trim()) {
                    rowErrors.account_number = 'Account Number is required.';
                    hasErrors = true;
                }
                if (Object.keys(rowErrors).length > 0) {
                    newBankErrors[index] = rowErrors;
                }
            });

            setBankErrors(newBankErrors);
            if (hasErrors) {
                return false;
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
                configuration = {};
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

            const response = await updatePartnerPaymentProviderConfig({
                id: linkageId,
                payment_provider_id: provider.id,
                payment_mode: formData.payment_mode || MODE_SANDBOX,
                status: status,
                is_default: isDefault,
                configuration: configuration,
                bank_details: isBank ? bankDetails : undefined
            } as any, configPartnerId);
            applySetup(response?.data);
            if (response && response.status && response.data && response.data.id) {
                setLinkageId(response.data.id);
                if (isBank && response.data.bank_details) {
                    setBankDetails(response.data.bank_details);
                }
            }
            toast.success(`${provider.name} configuration saved successfully!`);
            queryClient.invalidateQueries({ queryKey: ['globalConfigurations'] });
        } catch (error: any) {
            console.error(`Failed to save ${provider.name} config:`, error);
            // A bank row's own error (bank_details.0.routing_number) goes under its field.
            const serverErrors: Record<string, string | string[]> = error.response?.data?.errors || {};
            const rowErrors: Record<number, Record<string, string>> = {};
            Object.entries(serverErrors).forEach(([key, message]) => {
                const match = BANK_FIELD_ERROR.exec(key);
                if (match) {
                    const row = Number(match[1]);
                    rowErrors[row] = { ...rowErrors[row], [match[2]]: Array.isArray(message) ? message[0] : message };
                }
            });
            if (Object.keys(rowErrors).length > 0) {
                setBankErrors(rowErrors);
            }
            const keyErrors: FormErrors = {};
            Object.entries(serverErrors).forEach(([key, message]) => {
                const match = STRIPE_FIELD_ERROR.exec(key);
                if (match) {
                    keyErrors[`${STRIPE_FIELD[match[2]]}_${match[1]}`] = Array.isArray(message) ? message[0] : message;
                }
            });
            if (Object.keys(keyErrors).length > 0) {
                setErrors(prev => ({ ...prev, ...keyErrors }));
            }
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

                        {status && setupIssues.length > 0 && (
                            <div className="mb-4">
                                <PaymentSetupAlert
                                    title={canTakePayments ? `${provider.name} isn't fully set up` : `${provider.name} can't take payments yet`}
                                    description={canTakePayments
                                        ? 'Add what is missing below and save.'
                                        : `Payers aren't offered ${provider.name} until it's set up.`}
                                    issues={setupIssues}
                                />
                            </div>
                        )}

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
                                            <div className="card border shadow-none bg-light-subtle rounded-3">
                                                <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between p-3">
                                                    <div>
                                                        <h6 className="mb-0 fw-semibold text-dark fs-14">Bank Details Configuration</h6>
                                                        <p className="text-muted mb-0 fs-12">
                                                            Manage bank details for your customers to perform bank transfers in the <strong>{isSandbox ? 'Sandbox' : 'Production'}</strong> environment.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1.5 px-3"
                                                        onClick={() => addBankAccount(isSandbox ? MODE_SANDBOX : MODE_PRODUCTION)}
                                                        disabled={loading || toggling || !status}
                                                    >
                                                        <i className="ri-add-line fs-14"></i> Add Bank Account
                                                    </button>
                                                </div>
                                                <div className="card-body p-0">
                                                    {bankDetails.filter(b => b.payment_mode === (isSandbox ? MODE_SANDBOX : MODE_PRODUCTION)).length === 0 ? (
                                                        <div className="text-center py-5 px-3">
                                                            <div className="avatar-md mx-auto mb-3">
                                                                <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-24">
                                                                    <i className="ri-bank-line"></i>
                                                                </div>
                                                            </div>
                                                            <h5 className="fs-14 fw-semibold text-dark mb-1">No Bank Accounts Configured</h5>
                                                            <p className="text-muted fs-12 mb-3 max-w-350 mx-auto">
                                                                Add one or more bank accounts to show to clients during the bank transfer payment process.
                                                            </p>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1.5 px-3"
                                                                onClick={() => addBankAccount(isSandbox ? MODE_SANDBOX : MODE_PRODUCTION)}
                                                                disabled={loading || toggling || !status}
                                                            >
                                                                <i className="ri-add-line fs-14"></i> Add Your First Account
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="table-responsive">
                                                            <table className="table table-hover align-middle mb-0 fs-13">
                                                                <thead className="table-light">
                                                                    <tr>
                                                                        <th style={{ width: '60px' }} className="text-center">Default</th>
                                                                        <th>Bank Name</th>
                                                                        <th>Account Name</th>
                                                                        <th>Account Number</th>
                                                                        <th>Routing Number</th>
                                                                        <th>Instructions / Swift</th>
                                                                        <th style={{ width: '60px' }} className="text-center">Action</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {bankDetails.map((bank, index) => {
                                                                        if (bank.payment_mode !== (isSandbox ? MODE_SANDBOX : MODE_PRODUCTION)) return null;

                                                                        const rowErrors = bankErrors[index] || {};

                                                                        return (
                                                                            <tr key={index} className="animate__animated animate__fadeIn">
                                                                                <td className="text-center">
                                                                                    <div className="form-check d-flex justify-content-center m-0">
                                                                                        <input
                                                                                            className="form-check-input cursor-pointer"
                                                                                            type="radio"
                                                                                            name={`default_bank_${isSandbox ? MODE_SANDBOX : MODE_PRODUCTION}`}
                                                                                            checked={!!bank.is_default}
                                                                                            onChange={() => setDefaultBankAccount(index)}
                                                                                            disabled={loading || toggling || !status}
                                                                                            style={{ width: '1.15rem', height: '1.15rem' }}
                                                                                            title="Set as Default Account"
                                                                                        />
                                                                                    </div>
                                                                                </td>
                                                                                <td>
                                                                                    <div>
                                                                                        <input
                                                                                            type="text"
                                                                                            className={`form-control form-control-sm fs-13 ${rowErrors.bank_name ? 'is-invalid border-danger' : ''}`}
                                                                                            value={bank.bank_name || ''}
                                                                                            onChange={(e) => handleBankDetailChange(index, 'bank_name', e.target.value)}
                                                                                            placeholder="e.g. Chase Bank"
                                                                                            disabled={loading || toggling || !status}
                                                                                        />
                                                                                        {rowErrors.bank_name && (
                                                                                            <div className="text-danger fs-11 mt-1">
                                                                                                {rowErrors.bank_name}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                                <td>
                                                                                    <div>
                                                                                        <input
                                                                                            type="text"
                                                                                            className={`form-control form-control-sm fs-13 ${rowErrors.account_name ? 'is-invalid border-danger' : ''}`}
                                                                                            value={bank.account_name || ''}
                                                                                            onChange={(e) => handleBankDetailChange(index, 'account_name', e.target.value)}
                                                                                            placeholder="Holder Name"
                                                                                            disabled={loading || toggling || !status}
                                                                                        />
                                                                                        {rowErrors.account_name && (
                                                                                            <div className="text-danger fs-11 mt-1">
                                                                                                {rowErrors.account_name}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                                <td>
                                                                                    <div>
                                                                                        <input
                                                                                            type="text"
                                                                                            className={`form-control form-control-sm fs-13 ${rowErrors.account_number ? 'is-invalid border-danger' : ''}`}
                                                                                            value={bank.account_number || ''}
                                                                                            onChange={(e) => handleBankDetailChange(index, 'account_number', e.target.value)}
                                                                                            placeholder="Account Number"
                                                                                            disabled={loading || toggling || !status}
                                                                                        />
                                                                                        {rowErrors.account_number && (
                                                                                            <div className="text-danger fs-11 mt-1">
                                                                                                {rowErrors.account_number}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                                <td>
                                                                                    <div>
                                                                                        <input
                                                                                            type="text"
                                                                                            inputMode="numeric"
                                                                                            className={`form-control form-control-sm fs-13 ${rowErrors.routing_number ? 'is-invalid border-danger' : ''}`}
                                                                                            value={bank.routing_number || ''}
                                                                                            onChange={(e) => handleBankDetailChange(index, 'routing_number', e.target.value.replace(/\D/g, '').slice(0, ROUTING_DIGITS))}
                                                                                            placeholder="Routing Number"
                                                                                            disabled={loading || toggling || !status}
                                                                                        />
                                                                                        {rowErrors.routing_number && (
                                                                                            <div className="text-danger fs-11 mt-1">
                                                                                                {rowErrors.routing_number}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                                <td>
                                                                                    <input
                                                                                        type="text"
                                                                                        className="form-control form-control-sm fs-13"
                                                                                        value={bank.instructions || ''}
                                                                                        onChange={(e) => handleBankDetailChange(index, 'instructions', e.target.value)}
                                                                                        placeholder="Instructions/Swift"
                                                                                        disabled={loading || toggling || !status}
                                                                                    />
                                                                                </td>
                                                                                <td className="text-center">
                                                                                    <button
                                                                                        type="button"
                                                                                        className="btn btn-sm btn-soft-danger btn-icon waves-effect waves-light rounded-circle"
                                                                                        onClick={() => deleteBankAccount(index)}
                                                                                        disabled={loading || toggling || !status}
                                                                                        title="Delete Bank Account"
                                                                                        style={{ width: '28px', height: '28px', padding: 0 }}
                                                                                    >
                                                                                        <i className="ri-delete-bin-5-line fs-14"></i>
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
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
