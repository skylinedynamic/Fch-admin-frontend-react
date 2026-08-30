import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchAppConfigurations, saveAppConfigurations } from '../../../modules/settings/services';
import { MODULE_CREDIT_PROFILE } from '../../../config/appConfig';

import { MicroBiltConfigSkeleton } from '../../../components/Loader/SpecificSkeletons';
import DynamicActionModal from '../../../components/Common/Modals/DynamicActionModal';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';

interface FormData {
    parser_mode: string;
    openai_api_key: string;
    openai_model: string;
}

interface FormErrors {
    [key: string]: string | null;
}

const CreditProfileConfigForm: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [fetching, setFetching] = useState<boolean>(true);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [pendingMode, setPendingMode] = useState<string | null>(null);
    const [showApiKey, setShowApiKey] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormData>({
        parser_mode: '',
        openai_api_key: '',
        openai_model: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});

    useEffect(() => {
        loadParsingConfig();
    }, []);

    const loadParsingConfig = async () => {
        try {
            setFetching(true);
            const appRes = await fetchAppConfigurations(MODULE_CREDIT_PROFILE);
            const configData = appRes?.data || {};
            setFormData(prev => ({
                ...prev,
                parser_mode: configData.credit_profile_parser_mode || '',
                openai_api_key: configData.credit_profile_openai_api_key || '',
                openai_model: configData.credit_profile_openai_model || '',
            }));
        } catch (error) {
            console.error('Failed to load parsing configuration:', error);
            toast.error('Failed to load parsing configuration.');
        } finally {
            setFetching(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleModeChangeRequest = (newMode: string) => {
        if (newMode !== formData.parser_mode) {
            setPendingMode(newMode);
            setShowModal(true);
        }
    };

    const confirmModeChange = () => {
        if (pendingMode) {
            setFormData(prev => ({ ...prev, parser_mode: pendingMode }));
            setErrors({});
        }
        setShowModal(false);
        setPendingMode(null);
    };

    const cancelModeChange = () => {
        setShowModal(false);
        setPendingMode(null);
    };

    const validateParsing = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.parser_mode) {
            newErrors.parser_mode = 'Please select a parsing mode.';
        }
        if (formData.parser_mode === 'openai') {
            if (!formData.openai_api_key.trim()) {
                newErrors.openai_api_key = 'OpenAI API Key is required when OpenAI parsing is selected.';
            }
            if (!formData.openai_model.trim()) {
                newErrors.openai_model = 'Please select a model.';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateParsing()) {
            toast.error('Validation failed. Please correct the errors before saving.');
            return;
        }
        setLoading(true);
        try {
            const appPayload: Record<string, string> = {
                credit_profile_parser_mode: formData.parser_mode,
                credit_profile_openai_api_key: formData.openai_api_key,
                credit_profile_openai_model: formData.parser_mode === 'openai' ? formData.openai_model : '',
            };
            await saveAppConfigurations(MODULE_CREDIT_PROFILE, appPayload);
            toast.success('Parsing configuration saved successfully!');
        } catch (error: any) {
            console.error('Failed to save parsing config:', error);
            toast.error(error?.response?.data?.message || 'Failed to save parsing configuration.');
        } finally {
            setLoading(false);
        }
    };

    const isManual = formData.parser_mode === 'manual' || formData.parser_mode === '';
    const modeLabel = formData.parser_mode === 'openai' ? 'OpenAI Data Parsing' : formData.parser_mode === 'manual' ? 'Manual Data Parsing' : 'Not Set';

    return (
        <>
            <div className="card">
                <div className="card-header d-flex align-items-center justify-content-between bg-white border-bottom py-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className="avatar-sm flex-shrink-0">
                            <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
                                <i className="ri-file-chart-line"></i>
                            </div>
                        </div>
                        <div>
                            <h5 className="card-title mb-0 fs-15">Credit Profile</h5>
                            <p className="text-muted mb-0 fs-13">Configure credit report parsing rules</p>
                        </div>
                    </div>
                </div>

                <div className="card-body p-4">
                    {fetching ? (
                        <MicroBiltConfigSkeleton />
                    ) : (
                        <form id="score-config-form" onSubmit={handleSubmit}>
                            <div className="animate__animated animate__fadeIn">
                                <div className="d-flex align-items-center bg-success-subtle rounded-3 p-3 mb-4">
                                    <div className="flex-shrink-0 me-4">
                                        <div className="avatar-md">
                                            <div className="avatar-title bg-white rounded fs-24 text-danger">
                                                <i className="ri-file-pdf-line"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-grow-1">
                                        <h6 className="mb-1 text-dark fw-semibold fs-14">Credit Report Data Extraction</h6>
                                        <p className="text-muted mb-0 fs-13">
                                            <strong>Manual Parsing</strong> uses built-in regex rules to extract data from iSoftPull credit report PDFs.
                                            <strong> OpenAI Parsing</strong> sends the PDF text through an AI model for more accurate and flexible extraction, especially for non-standard formats.
                                        </p>
                                    </div>
                                </div>

                                {/* Parsing Mode Toggle */}
                                <div className="mb-4 bg-primary-subtle rounded-3 p-3">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div>
                                            <h6 className="mb-1 fw-bold fs-14">Parsing Mode</h6>
                                            <p className="text-muted mb-0 fs-13">
                                                Currently using <strong>{modeLabel}</strong> for credit report extraction.
                                            </p>
                                        </div>
                                        <div>
                                            <Dropdown
                                                value={formData.parser_mode}
                                                options={[
                                                    { label: '📋 Manual Data Parsing', value: 'manual' },
                                                    { label: '🤖 OpenAI Data Parsing', value: 'openai' }
                                                ]}
                                                onChange={(e: DropdownChangeEvent) => handleModeChangeRequest(e.value)}
                                                placeholder="Select Parsing Mode"
                                                className={`w-100 ${errors.parser_mode ? 'p-invalid' : ''}`}
                                                disabled={loading}
                                            />
                                            {errors.parser_mode && <div className="text-danger small mt-1"><i className="ri-error-warning-line me-1"></i>{errors.parser_mode}</div>}
                                        </div>
                                    </div>
                                </div>

                                {/* OpenAI Configuration Fields */}
                                {!isManual && (
                                    <div className="row g-4 mt-2 animate__animated animate__fadeIn">
                                        <div className="col-12">
                                            <div className="border rounded-3 p-3 bg-light-subtle">
                                                <h6 className="mb-3 fw-semibold fs-14">
                                                    <i className="ri-robot-line me-1"></i> OpenAI Configuration
                                                </h6>
                                                <div className="row g-4">
                                                    <div className="col-12">
                                                        <label className="form-label fw-medium">API Key</label>
                                                        <div className="input-group">
                                                            <span className="input-group-text bg-light text-muted config-label-span">
                                                                <i className="ri-key-2-line me-1"></i> API Key
                                                            </span>
                                                            <input
                                                                type={showApiKey ? 'text' : 'password'}
                                                                className={`form-control fs-14 config-input-no-shadow ${errors.openai_api_key ? 'is-invalid border-danger' : ''}`}
                                                                name="openai_api_key"
                                                                value={formData.openai_api_key}
                                                                onChange={handleInputChange}
                                                                placeholder="sk-..."
                                                            />
                                                            <button
                                                                type="button"
                                                                className="btn btn-light border"
                                                                onClick={() => setShowApiKey(!showApiKey)}
                                                                title={showApiKey ? 'Hide API key' : 'Show API key'}
                                                            >
                                                                <i className={`ri-${showApiKey ? 'eye-off-line' : 'eye-line'} text-muted`}></i>
                                                            </button>
                                                            {errors.openai_api_key && (
                                                                <div className="invalid-feedback d-block ps-3 pt-1">
                                                                    <i className="ri-error-warning-line me-1"></i>{errors.openai_api_key}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <small className="text-muted mt-1 d-block fs-12">Your OpenAI API key is stored securely and never shared.</small>
                                                    </div>

                                                    <div className="col-12">
                                                        <label className="form-label fw-medium">Model</label>
                                                        <div className="input-group">
                                                            <span className="input-group-text bg-light text-muted config-label-span">
                                                                <i className="ri-cpu-line me-1"></i> Model
                                                            </span>
                                                            <Dropdown
                                                                value={formData.openai_model || 'gpt-4o-mini'}
                                                                options={[
                                                                    { label: 'GPT-4o Mini (Cost-effective)', value: 'gpt-4o-mini' },
                                                                    { label: 'GPT-4o (Recommended)', value: 'gpt-4o' },
                                                                    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
                                                                    { label: 'GPT-3.5 Turbo (Fastest)', value: 'gpt-3.5-turbo' }
                                                                ]}
                                                                onChange={(e: DropdownChangeEvent) => {
                                                                    setFormData(prev => ({ ...prev, openai_model: e.value }));
                                                                    if (errors.openai_model) {
                                                                        setErrors(prev => ({ ...prev, openai_model: null }));
                                                                    }
                                                                }}
                                                                placeholder="Select Model"
                                                                className={`flex-grow-1 config-dropdown-radius ${errors.openai_model ? 'p-invalid' : ''}`}
                                                                disabled={loading}
                                                            />
                                                            {errors.openai_model && (
                                                                <div className="text-danger small mt-1 ps-3 pt-1 w-100">
                                                                    <i className="ri-error-warning-line me-1"></i>{errors.openai_model}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <small className="text-muted mt-1 d-block fs-12">GPT-4o provides the best accuracy for credit report parsing.</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="row mt-5 pt-3 border-top w-100 mx-0 px-0">
                                <div className="col-12 px-0">
                                    <div className="d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                                        <button
                                            type="submit"
                                            className="btn btn-primary px-4 py-2 fw-medium d-flex align-items-center justify-content-center flex-nowrap text-nowrap gap-2 w-100 w-sm-auto"
                                            disabled={loading}
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
                        </form>
                    )}
                </div>
            </div>

            <DynamicActionModal
                show={showModal}
                title="Confirm Parsing Mode Change"
                description={
                    <>
                        You are about to switch the parsing mode to <strong>{pendingMode === 'openai' ? 'OpenAI Data Parsing' : 'Manual Data Parsing'}</strong>.
                    </>
                }
                warningText={pendingMode === 'openai'
                    ? 'OpenAI parsing will send credit report text content to the OpenAI API for processing. This requires a valid API key and will incur usage costs based on your OpenAI billing plan. Ensure your API key is correct before proceeding.'
                    : 'Manual parsing uses built-in regex rules to extract data. It does not require an API key but may be less accurate for non-standard credit report formats.'
                }
                warningBgClass={pendingMode === 'openai'
                    ? 'bg-warning-subtle border-start border-3 border-warning'
                    : 'bg-info-subtle border-start border-3 border-info'
                }
                confirmText={`Yes, Change to ${pendingMode === 'openai' ? 'OpenAI Parsing' : 'Manual Parsing'}`}
                confirmBtnClass="btn-primary"
                onClose={cancelModeChange}
                onConfirm={confirmModeChange}
            />
        </>
    );
};

export default CreditProfileConfigForm;
