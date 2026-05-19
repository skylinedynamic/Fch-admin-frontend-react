import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchAppConfigurations, saveAppConfigurations } from '../../../modules/settings/services';
import { MODULE_MICROBILT } from '../../../config/appConfig';
import { MicroBiltConfig } from '../../../modules/settings/types';
import { MicroBiltConfigSkeleton } from '../../../components/Loader/SpecificSkeletons';
import DynamicActionModal from '../../../components/Common/Modals/DynamicActionModal';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import microbiltLogo from "../../../../assets/images/microbilt_logo.png";

interface FormData {
    mode: string;
    base_url_sandbox: string;
    client_id_sandbox: string;
    client_secret_sandbox: string;
    base_url_production: string;
    client_id_production: string;
    client_secret_production: string;
}

interface FormErrors {
    [key: string]: string | null;
}

const MicroBiltConfigForm: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [fetching, setFetching] = useState<boolean>(true);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [pendingMode, setPendingMode] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>({
        mode: '',
        base_url_sandbox: '',
        client_id_sandbox: '',
        client_secret_sandbox: '',
        base_url_production: '',
        client_id_production: '',
        client_secret_production: ''
    });

    const [errors, setErrors] = useState<FormErrors>({});

    const API_KEYS = [
        'microbilt_mode',
        'microbilt_base_url_sandbox',
        'microbilt_client_id_sandbox',
        'microbilt_client_secret_sandbox',
        'microbilt_base_url_production',
        'microbilt_client_id_production',
        'microbilt_client_secret_production'
    ];

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setFetching(true);
            const response = await fetchAppConfigurations(MODULE_MICROBILT);
            if (response && response.data) {
                const configData = response.data;

                setFormData({
                    mode: configData.microbilt_mode || '',
                    base_url_sandbox: configData.microbilt_base_url_sandbox || '',
                    client_id_sandbox: configData.microbilt_client_id_sandbox || '',
                    client_secret_sandbox: configData.microbilt_client_secret_sandbox || '',
                    base_url_production: configData.microbilt_base_url_production || '',
                    client_id_production: configData.microbilt_client_id_production || '',
                    client_secret_production: configData.microbilt_client_secret_production || ''
                });
            }
        } catch (error) {
            console.error('Failed to load MicroBilt configuration:', error);
            toast.error('Failed to load MicroBilt configuration.');
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
        if (newMode !== formData.mode) {
            setPendingMode(newMode);
            setShowModal(true);
        }
    };

    const confirmModeChange = () => {
        if (pendingMode) {
            setFormData(prev => ({ ...prev, mode: pendingMode }));
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

        if (!formData.mode) {
            newErrors.mode = 'Please select an environment.';
            setErrors(newErrors);
            return false;
        }

        const isSandbox = formData.mode === 'sandbox';
        const suffix = isSandbox ? '_sandbox' : '_production';

        const baseUrlKey = `base_url${suffix}` as keyof FormData;
        const clientIdKey = `client_id${suffix}` as keyof FormData;
        const clientSecretKey = `client_secret${suffix}` as keyof FormData;

        if (!formData[baseUrlKey]) newErrors[`base_url${suffix}`] = 'Base URL is required.';
        if (!formData[clientIdKey]) newErrors[`client_id${suffix}`] = 'Client ID is required.';
        if (!formData[clientSecretKey]) newErrors[`client_secret${suffix}`] = 'Client Secret is required.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const payload = {
                microbilt_mode: formData.mode,
                microbilt_base_url_sandbox: formData.base_url_sandbox,
                microbilt_client_id_sandbox: formData.client_id_sandbox,
                microbilt_client_secret_sandbox: formData.client_secret_sandbox,
                microbilt_base_url_production: formData.base_url_production,
                microbilt_client_id_production: formData.client_id_production,
                microbilt_client_secret_production: formData.client_secret_production
            };

            await saveAppConfigurations(MODULE_MICROBILT, payload);
            toast.success('MicroBilt configuration saved successfully!');
        } catch (error: any) {
            console.error('Failed to save MicroBilt config:', error);
            toast.error(error.response?.data?.message || 'Failed to save configuration.');
        } finally {
            setLoading(false);
        }
    };


    const isSandbox = formData.mode !== 'production';
    const suffix = isSandbox ? '_sandbox' : '_production';

    return (
        <>
            <div className="card">
                <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                    <div className="avatar-sm flex-shrink-0">
                        <div className="avatar-title bg-info-subtle text-info rounded fs-20">
                            <i className="ri-settings-4-line"></i>
                        </div>
                    </div>
                    <div>
                        <h5 className="card-title mb-0 fs-15">MicroBilt Integration</h5>
                        <p className="text-muted mb-0 fs-13">Configure MicroBilt API settings for Sandbox and Production</p>
                    </div>
                </div>
                <div className="card-body p-4">
                    {fetching ? (
                        <MicroBiltConfigSkeleton />
                    ) : (
                        <>
                            <div className="d-flex align-items-center bg-info-subtle rounded-3 p-3 mb-4">
                                <div className="flex-shrink-0 me-4">
                                    <img src={microbiltLogo} alt="MicroBilt Logo" style={{ height: '35px' }} />
                                </div>
                                <div className="flex-grow-1">
                                    <h6 className="mb-1 text-dark fw-semibold fs-14">Credit Data & Risk Management</h6>
                                    <p className="text-muted mb-0 fs-13">
                                        Connect to MicroBilt's alternative credit data solutions. Manage your API credentials securely to enable comprehensive borrower underwriting and identity verification directly within the platform.
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
                                                    value={formData.mode}
                                                    options={[
                                                        { label: '🧪 Sandbox', value: 'sandbox' },
                                                        { label: '🚀 Production', value: 'production' }
                                                    ]}
                                                    onChange={(e: DropdownChangeEvent) => handleModeChangeRequest(e.value)}
                                                    placeholder="Select Environment"
                                                    className={`w-100 ${errors.mode ? 'p-invalid' : ''}`}
                                                    disabled={loading}
                                                />
                                                {errors.mode && <div className="text-danger small mt-1"><i className="ri-error-warning-line me-1"></i>{errors.mode}</div>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row g-4 mt-2">
                                        <div className="col-12">
                                            <div className="input-group">
                                                <span className={`input-group-text ${errors[`base_url${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`} style={{ minWidth: '120px', justifyContent: 'center' }}>
                                                    API URL
                                                </span>
                                                <input
                                                    type="url"
                                                    className={`form-control fs-14 ${errors[`base_url${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                    name={`base_url${suffix}`}
                                                    value={formData[`base_url${suffix}` as keyof FormData] || ''}
                                                    onChange={handleInputChange}
                                                    placeholder={isSandbox ? "https://apitest.microbilt.com/" : "https://api.microbilt.com/"}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {errors[`base_url${suffix}`] && (
                                                    <div className="invalid-feedback ps-3 pb-2">
                                                        <i className="ri-error-warning-line me-1"></i>{errors[`base_url${suffix}`]}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-lg-6">
                                            <div className="input-group">
                                                <span className={`input-group-text ${errors[`client_id${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`} style={{ minWidth: '120px', justifyContent: 'center' }}>
                                                    Client ID
                                                </span>
                                                <input
                                                    type="text"
                                                    className={`form-control fs-14 ${errors[`client_id${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                    name={`client_id${suffix}`}
                                                    value={formData[`client_id${suffix}`] as keyof FormData || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter Client ID"
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {errors[`client_id${suffix}`] && (
                                                    <div className="invalid-feedback ps-3 pb-2">
                                                        <i className="ri-error-warning-line me-1"></i>{errors[`client_id${suffix}`]}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-lg-6">
                                            <div className="input-group">
                                                <span className={`input-group-text ${errors[`client_secret${suffix}`] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`} style={{ minWidth: '120px', justifyContent: 'center' }}>
                                                    Secret Key
                                                </span>
                                                <input
                                                    type="password"
                                                    className={`form-control fs-14 ${errors[`client_secret${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                                    name={`client_secret${suffix}`}
                                                    value={formData[`client_secret${suffix}`] as keyof FormData || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter Client Secret"
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {errors[`client_secret${suffix}`] && (
                                                    <div className="invalid-feedback ps-3 pb-2">
                                                        <i className="ri-error-warning-line me-1"></i>{errors[`client_secret${suffix}`]}
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
            </div>

            <DynamicActionModal
                show={showModal}
                title="Confirm Environment Change"
                description={
                    <>
                        You are about to switch the configuration environment to <strong>{pendingMode === 'production' ? 'Production' : 'Sandbox'}</strong>.
                    </>
                }
                warningText="Switching to Production will use live credentials for MicroBilt API calls, resulting in real transactions and potential costs. Please ensure your credentials are correct."
                warningBgClass={pendingMode === 'production'
                    ? 'bg-danger-subtle border-start border-3 border-danger'
                    : 'bg-info-subtle border-start border-3 border-info'
                }
                imgSrc={microbiltLogo}
                confirmText={`Yes, Change to ${pendingMode === 'production' ? 'Production' : 'Sandbox'}`}
                confirmBtnClass={pendingMode === 'production' ? 'btn-danger' : 'btn-primary'}
                onClose={cancelModeChange}
                onConfirm={confirmModeChange}
            />
        </>
    );
};

export default MicroBiltConfigForm;
