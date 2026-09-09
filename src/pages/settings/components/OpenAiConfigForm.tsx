import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Dropdown } from 'primereact/dropdown';
import { fetchOpenAiConfig, fetchOpenAiModels, saveOpenAiConfig } from '../../../modules/settings/services';
import { OpenAiConfigSkeleton } from '../../../components/Loader/SpecificSkeletons';
import { DEFAULT_FALLBACK_MODELS, DEFAULT_EFFORT_OPTIONS } from '../../../config';

interface FormData {
    api_key: string;
    aue_model: string;
    reasoning_effort: string;
}

interface FormErrors {
    [key: string]: string | null;
}

/**
 * Stand-in shown in the key field when the server already holds a key.
 *
 * The key itself never leaves the server, so there is nothing real to display —
 * this fills the field so it reads as configured rather than empty. It is cleared
 * the moment the field is focused, and is sent as a blank key (meaning "keep the
 * stored one") if it is left untouched.
 *
 * Its length is that of a typical OpenAI project key, so a stored key renders the
 * same full row of dots a freshly pasted one does. The characters themselves are
 * never seen — the field is a password input — and never submitted.
 */
const STORED_KEY_MASK_CHAR = '•';
const STORED_KEY_MASK = STORED_KEY_MASK_CHAR.repeat(164);

const OpenAiConfigForm: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [fetching, setFetching] = useState<boolean>(true);
    const [modelOptions, setModelOptions] = useState<Array<{ label: string; value: string }>>(
        DEFAULT_FALLBACK_MODELS.map(m => ({ label: m, value: m }))
    );
    const [effortOptions, setEffortOptions] = useState<Array<{ label: string; value: string }>>(
        DEFAULT_EFFORT_OPTIONS
    );
    const [modelsError, setModelsError] = useState<string | null>(null);
    // Whether the server already holds a key. The key itself is never sent to the
    // browser, so this is the only way to know — and it decides whether the field
    // may be left blank to keep the stored key.
    const [hasApiKey, setHasApiKey] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormData>({
        api_key: '',
        aue_model: 'gpt-5.6-luna',
        reasoning_effort: 'medium'
    });
    const [errors, setErrors] = useState<FormErrors>({});

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setFetching(true);
            const response = await fetchOpenAiConfig();
            const configData = response?.data || response || {};

            const savedModel = configData.aue_model || 'gpt-5.6-luna';

            setHasApiKey(!!configData.has_api_key);

            // The API key is deliberately never returned by the server, so when one
            // is stored the field shows a stand-in instead of the real value.
            setFormData({
                api_key: configData.has_api_key ? STORED_KEY_MASK : '',
                aue_model: savedModel,
                reasoning_effort: configData.reasoning_effort || 'medium'
            });

            await loadModels(savedModel);
        } catch (error: any) {
            console.error('Failed to load OpenAI configuration:', error);
            setHasApiKey(false);
            await loadModels('gpt-5.6-luna');
        } finally {
            setFetching(false);
        }
    };

    const buildOptions = (models: string[], savedModel: string) => {
        const sourceList = (models && models.length > 0) ? models : DEFAULT_FALLBACK_MODELS;
        const options = sourceList.map(id => ({ label: id, value: id }));

        if (savedModel && !sourceList.includes(savedModel)) {
            options.unshift({ label: `${savedModel} (currently saved)`, value: savedModel });
        }

        return options;
    };

    const loadModels = async (savedModel: string) => {
        try {
            const response = await fetchOpenAiModels();
            const rawModels = response?.data?.models || response?.models || [];
            const modelsList = rawModels.length > 0 ? rawModels : DEFAULT_FALLBACK_MODELS;
            setModelOptions(buildOptions(modelsList, savedModel));

            const rawEfforts = response?.data?.reasoning_efforts || response?.reasoning_efforts || [];
            setEffortOptions(rawEfforts.length > 0 ? rawEfforts : DEFAULT_EFFORT_OPTIONS);
            setModelsError(response?.data?.error || response?.error || null);
        } catch (error) {
            console.error('Failed to load OpenAI models:', error);
            setModelOptions(buildOptions(DEFAULT_FALLBACK_MODELS, savedModel));
            setEffortOptions(DEFAULT_EFFORT_OPTIONS);
            setModelsError('Could not load the model list from OpenAI. Check the API key.');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        // The key field starts out holding the stand-in. Clicking it leaves that
        // alone — only an actual edit replaces it, and then the stand-in has to go
        // rather than be typed onto. A real key never contains this character, so
        // dropping every one of them leaves exactly what was typed or pasted; if
        // the edit was a deletion, nothing is left and the field simply clears.
        const next = name === 'api_key' && isKeyUntouched()
            ? value.split(STORED_KEY_MASK_CHAR).join('')
            : value;

        setFormData(prev => ({ ...prev, [name]: next }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    /** True while the field still holds the stand-in, i.e. the key was not edited. */
    const isKeyUntouched = (): boolean => formData.api_key === STORED_KEY_MASK;

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        const key = isKeyUntouched() ? '' : (formData.api_key ? formData.api_key.trim() : '');

        // Mirrors the server rule: required only until a key has been stored.
        // Once one is stored, blank means "keep the existing key".
        if (!key && !hasApiKey) {
            newErrors.api_key = 'The API key is required.';
        } else if (key && !key.startsWith('sk-')) {
            newErrors.api_key = 'The API key must start with "sk-".';
        } else if (!isKeyUntouched() && formData.api_key.trim() !== formData.api_key) {
            newErrors.api_key = 'Remove leading or trailing spaces from the key.';
        }

        if (!formData.aue_model || !formData.aue_model.trim()) {
            newErrors.aue_model = 'The underwriting model is required.';
        }

        if (!formData.reasoning_effort || !formData.reasoning_effort.trim()) {
            newErrors.reasoning_effort = 'The reasoning effort is required.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await saveOpenAiConfig({
                // An untouched field sends a blank key, which the server reads as
                // "keep the stored one" — the stand-in is never submitted.
                api_key: isKeyUntouched() ? '' : formData.api_key.trim(),
                aue_model: formData.aue_model,
                reasoning_effort: formData.reasoning_effort
            });

            toast.success('OpenAI configuration saved successfully!');
            await loadConfig();
        } catch (error: any) {
            console.error('Failed to save OpenAI config:', error);

            const apiErrors = error?.response?.data?.errors;
            if (apiErrors) {
                const mapped: FormErrors = {};
                Object.keys(apiErrors).forEach(key => {
                    mapped[key] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
                });
                setErrors(mapped);
            }
            toast.error(error?.response?.data?.message || 'Failed to save configuration.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                <div className="avatar-sm flex-shrink-0">
                    <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
                        <i className="ri-sparkling-2-line"></i>
                    </div>
                </div>
                <div>
                    <h5 className="card-title mb-0 fs-15">OpenAI Configuration</h5>
                    <p className="text-muted mb-0 fs-13">
                        Credentials and Model Used for Validation and AI Underwriting
                    </p>
                </div>
            </div>

            <div className="card-body p-4">
                {fetching ? (
                    <OpenAiConfigSkeleton />
                ) : (
                    <>
                        <div className="d-flex align-items-center bg-primary-subtle rounded-3 p-3 mb-4">
                            <div className="avatar-sm flex-shrink-0 me-3">
                                <div className="avatar-title bg-primary text-white rounded fs-20">
                                    <i className="ri-sparkling-2-line"></i>
                                </div>
                            </div>
                            <div className="flex-grow-1">
                                <h6 className="mb-1 text-dark fw-semibold fs-14">AI Underwriting & Data Validation</h6>
                                <p className="text-muted mb-0 fs-13">
                                    Configure your OpenAI API credentials and AI models for Pre-Qualification underwriting calculations and borrower application integrity verification.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-12">
                                    <label htmlFor="openai-api-key" className="form-label fw-medium">
                                        API Key {!hasApiKey && <span className="text-danger">*</span>}
                                    </label>
                                    <div className="input-group">
                                        <span className={`input-group-text ${errors.api_key ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
                                            <i className="ri-key-2-line"></i>
                                        </span>
                                        <input
                                            id="openai-api-key"
                                            type="password"
                                            name="api_key"
                                            className={`form-control ${errors.api_key ? 'is-invalid border-danger' : ''}`}
                                            placeholder="sk-..."
                                            value={formData.api_key}
                                            onChange={handleInputChange}
                                            autoComplete="new-password"
                                            disabled={loading}
                                        />
                                    </div>
                                    {errors.api_key && (
                                        <div className="text-danger fs-12 mt-1">
                                            <i className="ri-error-warning-line me-1"></i>
                                            {errors.api_key}
                                        </div>
                                    )}
                                    <small className="text-muted d-block mt-1">
                                        {hasApiKey
                                            ? 'A key is already stored, encrypted, on the server — it is never sent back to the browser, so this shows a placeholder rather than the key itself. Leave it as is to keep it, or type over it to replace it.'
                                            : 'Stored encrypted on the server and used for AI Underwriting and Validation.'}
                                    </small>
                                </div>

                                <div className="col-12 col-md-6">
                                    <label htmlFor="openai-aue-model" className="form-label fw-medium">
                                        Underwriting Model <span className="text-danger">*</span>
                                    </label>
                                    <Dropdown
                                        inputId="openai-aue-model"
                                        value={formData.aue_model}
                                        options={modelOptions}
                                        optionLabel="label"
                                        optionValue="value"
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, aue_model: e.value }));
                                            if (errors.aue_model) {
                                                setErrors(prev => ({ ...prev, aue_model: null }));
                                            }
                                        }}
                                        placeholder="Select a model"
                                        className={`w-100 ${errors.aue_model ? 'p-invalid border-danger' : ''}`}
                                        filter
                                        filterPlaceholder="Search models"
                                        disabled={loading}
                                    />
                                    {errors.aue_model && (
                                        <div className="text-danger fs-12 mt-1">
                                            <i className="ri-error-warning-line me-1"></i>
                                            {errors.aue_model}
                                        </div>
                                    )}
                                    <small className="text-muted d-block mt-1">
                                        {modelsError ? (
                                            <>
                                                Showing the server&apos;s default models —{' '}
                                                {modelsError.includes('api.model.read')
                                                    ? 'the live list needs the api.model.read scope on this key.'
                                                    : 'the live list could not be loaded.'}
                                            </>
                                        ) : (
                                            'Live list from your OpenAI account. Used for the validator and both AUE generations.'
                                        )}
                                    </small>
                                </div>

                                <div className="col-12 col-md-6">
                                    <label htmlFor="openai-reasoning-effort" className="form-label fw-medium">
                                        Reasoning Effort <span className="text-danger">*</span>
                                    </label>
                                    <Dropdown
                                        inputId="openai-reasoning-effort"
                                        value={formData.reasoning_effort}
                                        options={effortOptions}
                                        optionLabel="label"
                                        optionValue="value"
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, reasoning_effort: e.value }));
                                            if (errors.reasoning_effort) {
                                                setErrors(prev => ({ ...prev, reasoning_effort: null }));
                                            }
                                        }}
                                        className={`w-100 ${errors.reasoning_effort ? 'p-invalid border-danger' : ''}`}
                                        disabled={loading}
                                    />
                                    {errors.reasoning_effort && (
                                        <div className="text-danger fs-12 mt-1">
                                            <i className="ri-error-warning-line me-1"></i>
                                            {errors.reasoning_effort}
                                        </div>
                                    )}
                                    <small className="text-muted d-block mt-1">
                                        Applied to the internal underwriting generation. Only the o-series and GPT-5 model
                                        families support this; it is omitted automatically for any other model.
                                    </small>
                                </div>
                            </div>

                            <div className="d-flex justify-content-end mt-4">
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Configuration'
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default OpenAiConfigForm;
