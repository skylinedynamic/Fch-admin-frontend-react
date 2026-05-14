import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchSettings, updateSettings } from '../../../modules/settings/services';
import FormLoader from '../../../components/Loader/FormLoader';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import DynamicActionModal from '../../../components/Common/Modals/DynamicActionModal';
import stripeLogo from "../../../../assets/images/stripe_logo.png";

interface FormData {
    stripe_key_sandbox: string;
    stripe_secret_sandbox: string;
    stripe_key_production: string;
    stripe_secret_production: string;
    payment_mode: string;
}

interface FormErrors {
    [key: string]: string | null;
}

const StripeConfigForm: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [fetching, setFetching] = useState<boolean>(true);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [pendingMode, setPendingMode] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>({
        stripe_key_sandbox: '',
        stripe_secret_sandbox: '',
        stripe_key_production: '',
        stripe_secret_production: '',
        payment_mode: 'sandbox'
    });

    const [errors, setErrors] = useState<FormErrors>({});

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setFetching(true);
            const response = await fetchSettings();
            if (response && response.data) {
                const data = (response.data as any).data || response.data;
                setFormData({
                    stripe_key_sandbox: data.stripe_key_sandbox || '',
                    stripe_secret_sandbox: data.stripe_secret_sandbox || '',
                    stripe_key_production: data.stripe_key_production || '',
                    stripe_secret_production: data.stripe_secret_production || '',
                    payment_mode: data.payment_mode || 'sandbox'
                });
            }
        } catch (error) {
            console.error('Failed to load Stripe configuration:', error);
            toast.error('Failed to load Stripe configuration.');
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
        const mode = formData.payment_mode || 'sandbox';
        const suffix = `_${mode}`;

        if (!formData[`stripe_key${suffix}` as keyof FormData]) {
            newErrors[`stripe_key${suffix}`] = 'Stripe Publishable Key is required.';
        }
        if (!formData[`stripe_secret${suffix}` as keyof FormData]) {
            newErrors[`stripe_secret${suffix}`] = 'Stripe Secret Key is required.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await updateSettings(formData);
            toast.success('Stripe configuration saved successfully!');
        } catch (error: any) {
            console.error('Failed to save Stripe config:', error);
            toast.error(error.response?.data?.message || 'Failed to save configuration.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="card">
                <div className="card-body p-4">
                    <FormLoader count={4} colClass="col-12" />
                </div>
            </div>
        );
    }

    const isSandbox = formData.payment_mode !== 'production';
    const suffix = isSandbox ? '_sandbox' : '_production';

    return (
        <div className="card">
            <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                <div className="avatar-sm flex-shrink-0">
                    <div className="avatar-title bg-info-subtle text-info rounded fs-20">
                        <i className="ri-bank-card-2-line"></i>
                    </div>
                </div>
                <div>
                    <h5 className="card-title mb-0 fs-15">Payment Integration</h5>
                    <p className="text-muted mb-0 fs-13">Securely manage your Stripe payment gateway credentials</p>
                </div>
            </div>
            <div className="card-body p-4">
                <div className="d-flex align-items-center bg-info-subtle border border-info border-opacity-25 border-dashed rounded-3 p-3 mb-4">
                    <div className="flex-shrink-0 me-4">
                        <img src={stripeLogo} alt="Stripe Logo" style={{ height: '35px' }} />
                    </div>
                    <div className="flex-grow-1">
                        <h6 className="mb-1 text-dark fw-semibold fs-14">Stripe Payments</h6>
                        <p className="text-muted mb-0 fs-13">
                            Connect your platform to Stripe to handle secure transactions. This configuration supports both testing and live environments with dedicated API keys for each.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="animate__animated animate__fadeIn">
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
                            {/* Publishable Key */}
                            <div className="col-12">
                                <div className="input-group">
                                    <span className={`input-group-text ${errors[`stripe_key${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`} style={{ minWidth: '150px', justifyContent: 'center' }}>
                                        Publishable Key
                                    </span>
                                    <input
                                        type="text"
                                        className={`form-control fs-14 ${errors[`stripe_key${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                        name={`stripe_key${suffix}`}
                                        value={formData[`stripe_key${suffix}` as keyof FormData] || ''}
                                        onChange={handleInputChange}
                                        placeholder={isSandbox ? "pk_test_..." : "pk_live_..."}
                                        style={{ boxShadow: 'none' }}
                                    />
                                    {errors[`stripe_key${suffix}`] && (
                                        <div className="invalid-feedback ps-3 pb-2">
                                            <i className="ri-error-warning-line me-1"></i>{errors[`stripe_key${suffix}`]}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Secret Key */}
                            <div className="col-12">
                                <div className="input-group">
                                    <span className={`input-group-text ${errors[`stripe_secret${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`} style={{ minWidth: '150px', justifyContent: 'center' }}>
                                        Secret Key
                                    </span>
                                    <input
                                        type="password"
                                        className={`form-control fs-14 ${errors[`stripe_secret${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                        name={`stripe_secret${suffix}`}
                                        value={formData[`stripe_secret${suffix}` as keyof FormData] || ''}
                                        onChange={handleInputChange}
                                        placeholder={isSandbox ? "sk_test_..." : "sk_live_..."}
                                        style={{ boxShadow: 'none' }}
                                    />
                                    {errors[`stripe_secret${suffix}`] && (
                                        <div className="invalid-feedback ps-3 pb-2">
                                            <i className="ri-error-warning-line me-1"></i>{errors[`stripe_secret${suffix}`]}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-12 mt-5 pt-3 border-top">
                            <div className="d-flex justify-content-end">
                                <button
                                    type="submit"
                                    className="btn btn-primary px-4 py-2 fw-medium d-flex align-items-center gap-2"
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
                                            <span>Save Stripe Settings</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <DynamicActionModal
                show={showModal}
                title="Confirm Environment Change"
                description={
                    <>
                        You are about to switch the payment environment to <strong>{pendingMode === 'production' ? 'Production' : 'Sandbox'}</strong>.
                    </>
                }
                warningText="Switching to Production will use live Stripe keys. Real transactions will be processed if this is used in checkout. Please ensure your live keys are correct."
                warningBgClass={pendingMode === 'production'
                    ? 'bg-danger-subtle border-start border-3 border-danger'
                    : 'bg-info-subtle border-start border-3 border-info'
                }
                imgSrc={stripeLogo}
                confirmText={`Yes, Change to ${pendingMode === 'production' ? 'Production' : 'Sandbox'}`}
                confirmBtnClass={pendingMode === 'production' ? 'btn-danger' : 'btn-primary'}
                onClose={cancelModeChange}
                onConfirm={confirmModeChange}
            />
        </div>
    );
};

export default StripeConfigForm;
