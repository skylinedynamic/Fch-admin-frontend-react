import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Dropdown } from 'primereact/dropdown';
import { fetchOpenAiConfig, fetchOpenAiModels, saveOpenAiConfig } from '../../../modules/settings/services';
import { OpenAiConfigSkeleton } from '../../../components/Loader/SpecificSkeletons';

interface FormData {
    api_key: string;
    aue_model: string;
    reasoning_effort: string;
}

interface FormErrors {
    [key: string]: string | null;
}

const OpenAiConfigForm: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [fetching, setFetching] = useState<boolean>(true);
    const [modelOptions, setModelOptions] = useState<Array<{ label: string; value: string }>>([]);
    const [effortOptions, setEffortOptions] = useState<Array<{ label: string; value: string }>>([]);
    const [modelsError, setModelsError] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>({
        api_key: '',
        aue_model: '',
        reasoning_effort: 'medium'
    });
    const [errors, setErrors] = useState<FormErrors>({});
    // Ciphertext of the stored key, as loaded from the server.
    const [storedCipher, setStoredCipher] = useState<string>('');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setFetching(true);
            const response = await fetchOpenAiConfig();
            const configData = response?.data || {};

            const savedModel = configData.aue_model || 'gpt-5.6-luna';
            // The field shows the stored ciphertext, never the key itself. It is
            // kept so an untouched field is recognised on save and the stored key
            // is left alone rather than being encrypted a second time.
            const encrypted = configData.api_key_encrypted || '';
            setStoredCipher(encrypted);

            setFormData({
                api_key: encrypted,
                aue_model: savedModel,
                reasoning_effort: configData.reasoning_effort || 'medium'
            });

            await loadModels(savedModel);
        } catch (error) {
            console.error('Failed to load OpenAI configuration:', error);
            toast.error('Failed to load OpenAI configuration.');
        } finally {
            setFetching(false);
        }
    };

    // The model list comes from OpenAI itself, so it always reflects what this
    // API key can actually use rather than a list that goes stale in the code.
    const buildOptions = (models: string[], savedModel: string) => {
        const options = models.map(id => ({ label: id, value: id }));

        // Keep a previously saved model selectable even if it is not in the list,
        // so opening this screen can never silently clear it.
        if (savedModel && !models.includes(savedModel)) {
            options.unshift({ label: `${savedModel} (currently saved)`, value: savedModel });
        }

        return options;
    };

    // The API always returns a usable list — the live one from OpenAI, or the
    // server's configured fallback when the key cannot enumerate models — so the
    // model list is never hard-coded here.
    const loadModels = async (savedModel: string) => {
        try {
            const response = await fetchOpenAiModels();
            setModelOptions(buildOptions(response?.data?.models || [], savedModel));
            // Effort levels come from the same server config the save request
            // validates against, so the two can never drift apart.
            setEffortOptions(response?.data?.reasoning_efforts || []);
            setModelsError(response?.data?.error || null);
        } catch (error) {
            console.error('Failed to load OpenAI models:', error);
            setModelOptions(buildOptions([], savedModel));
            setModelsError('Could not load the model list from OpenAI. Check the API key.');
        }
    };


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // True while the field still holds the ciphertext that was loaded, i.e. the
    // admin has not typed a replacement key.
    const isUnchangedKey = formData.api_key === storedCipher && storedCipher !== '';

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        const key = formData.api_key;

        // The untouched ciphertext is not a new key, so skip the format checks —
        // it is sent as blank ("keep the stored key") on save.
        if (isUnchangedKey) {
            setErrors({});
            return true;
        }

        // A key is optional — blank keeps the server's .env value — but if one is
        // entered it must look like an OpenAI key. A capitalised "Sk-" or a stray
        // space is the classic paste error and fails with a 401 at run time.
        if (key) {
            if (key.trim() !== key) {
                newErrors.api_key = 'Remove the leading or trailing spaces from the key.';
            } else if (!key.startsWith('sk-')) {
                newErrors.api_key = 'An OpenAI key starts with a lowercase "sk-". Check for a stray capital letter.';
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
            await saveOpenAiConfig({
                // Never send the ciphertext back as if it were a new key — blank
                // tells the server to keep what it already has.
                api_key: isUnchangedKey ? '' : formData.api_key,
                aue_model: formData.aue_model,
                reasoning_effort: formData.reasoning_effort
            });

            toast.success('OpenAI configuration saved successfully!');

            // Reload so the field shows the ciphertext of whatever is now stored,
            // and because a newly saved key can expose a different model list.
            await loadConfig();
        } catch (error: any) {
            console.error('Failed to save OpenAI config:', error);

            // Surface per-field errors from the API validation.
            const apiErrors = error?.response?.data?.errors;
            if (apiErrors) {
                const mapped: FormErrors = {};
                Object.keys(apiErrors).forEach(key => {
                    mapped[key] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
                });
                setErrors(mapped);
            }
            toast.error(error.response?.data?.message || 'Failed to save configuration.');
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
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-12">
                                <label htmlFor="openai-api-key" className="form-label">API Key</label>
                                <div className="input-group">
                                    <input
                                        id="openai-api-key"
                                        // Always masked, matching the Payment Integration
                                        // secret key field. The value behind the dots is
                                        // the stored ciphertext, never the real key.
                                        type="password"
                                        name="api_key"
                                        className={`form-control ${errors.api_key ? 'is-invalid' : ''}`}
                                        placeholder="sk-..."
                                        value={formData.api_key}
                                        onChange={handleInputChange}
                                        autoComplete="new-password"
                                        disabled={loading}
                                    />
                                    {errors.api_key && <div className="invalid-feedback">{errors.api_key}</div>}
                                </div>
                                <small className="text-muted d-block mt-1">
                                    {isUnchangedKey
                                        ? 'This is the encrypted stored value — the key itself is never sent to the browser. Type over it to replace the key, or leave it as-is to keep the current one.'
                                        : 'Stored encrypted on the server and never returned by the API.'}
                                </small>
                            </div>

                            <div className="col-12 col-md-6">
                                <label htmlFor="openai-aue-model" className="form-label">Underwriting Model</label>
                                <Dropdown
                                    inputId="openai-aue-model"
                                    value={formData.aue_model}
                                    options={modelOptions}
                                    optionLabel="label"
                                    optionValue="value"
                                    onChange={(e) => setFormData(prev => ({ ...prev, aue_model: e.value }))}
                                    placeholder="Select a model"
                                    className={`w-100 ${errors.aue_model ? 'p-invalid' : ''}`}
                                    filter
                                    filterPlaceholder="Search models"
                                    disabled={loading}
                                />
                                {errors.aue_model && <div className="text-danger fs-12 mt-1">{errors.aue_model}</div>}
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
                                <label htmlFor="openai-reasoning-effort" className="form-label">Reasoning Effort</label>
                                <Dropdown
                                    inputId="openai-reasoning-effort"
                                    value={formData.reasoning_effort}
                                    options={effortOptions}
                                    optionLabel="label"
                                    optionValue="value"
                                    onChange={(e) => setFormData(prev => ({ ...prev, reasoning_effort: e.value }))}
                                    className={`w-100 ${errors.reasoning_effort ? 'p-invalid' : ''}`}
                                    disabled={loading}
                                />
                                {errors.reasoning_effort && <div className="text-danger fs-12 mt-1">{errors.reasoning_effort}</div>}
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
                )}
            </div>
        </div>
    );
};

export default OpenAiConfigForm;
