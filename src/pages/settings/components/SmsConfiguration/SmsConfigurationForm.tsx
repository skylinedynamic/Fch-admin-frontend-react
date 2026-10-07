import React, { useEffect, useMemo, useState } from 'react';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import FormLoader from '../../../../components/Loader/FormLoader';
import { useSaveSmsConfiguration, useSmsConfiguration } from '../../../../modules/settings/queries';
import type { SaveSmsConfigurationPayload, SmsConfiguration } from '../../../../modules/settings/types';
import { useAuthStore } from '../../../../store/auth/authStore';
import SmsField from './SmsField';
import TestSmsPanel from './TestSmsPanel';
import { apiErrorMessage, apiFieldErrors } from './apiErrors';

type FormState = SaveSmsConfigurationPayload;

const toFormState = (configuration: SmsConfiguration | null, country: string, provider: string): FormState => ({
    country: configuration?.country ?? country,
    provider: configuration?.provider ?? provider,
    is_enabled: configuration?.is_enabled ?? false,
    account_sid: configuration?.account_sid ?? '',
    // Never filled in: the API only returns a mask, and a blank token on save
    // keeps the stored one.
    auth_token: '',
    from_number: configuration?.from_number ?? '',
    messaging_service_sid: configuration?.messaging_service_sid ?? '',
});

/**
 * Settings > SMS Configuration: the account texts (notifications and 2FA
 * codes) are sent from. A white-label partner's covers its own users; the
 * host's covers the host and every certified partner. While it is switched
 * off no texts are sent for them - there is no fallback to another account.
 */
const SmsConfigurationForm: React.FC = () => {
    const { data, isLoading, isError } = useSmsConfiguration();
    const isHost = useAuthStore((state) => Boolean(state.user?.is_host));
    const save = useSaveSmsConfiguration();

    const configuration = data?.data.configuration ?? null;
    const countries = data?.data.options.countries ?? [];

    const [form, setForm] = useState<FormState | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (data && form === null) {
            const country = countries[0];
            setForm(toFormState(configuration, country?.value ?? '', country?.providers[0]?.value ?? ''));
        }
    }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

    const providers = useMemo(
        () => countries.find((c) => c.value === form?.country)?.providers ?? [],
        [countries, form?.country]
    );

    if (isError) {
        return <div className="alert alert-danger mb-0">Failed to load the SMS configuration.</div>;
    }

    const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
        setForm((current) => (current ? { ...current, [field]: value } : current));
        if (errors[field]) {
            const { [field]: _removed, ...rest } = errors;
            setErrors(rest);
        }
    };

    const handleCountryChange = (value: string) => {
        const nextProviders = countries.find((c) => c.value === value)?.providers ?? [];
        setForm((current) => (current ? { ...current, country: value, provider: nextProviders[0]?.value ?? '' } : current));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form) return;

        setErrors({});
        save.mutate(form, {
            onSuccess: (response) => {
                setForm((current) => (current ? { ...current, auth_token: '' } : current));
                toast.success(response.message ?? 'SMS configuration saved.');
            },
            onError: (error) => {
                const fieldErrors = apiFieldErrors(error);
                if (fieldErrors) {
                    setErrors(fieldErrors);
                } else {
                    toast.error(apiErrorMessage(error, 'Failed to save the SMS configuration.'));
                }
            },
        });
    };

    const tokenSaved = Boolean(configuration?.auth_token);

    return (
        <div className="card sms-config-form">
            <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                <div className="avatar-sm flex-shrink-0">
                    <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
                        <i className="ri-message-2-line"></i>
                    </div>
                </div>
                <div>
                    <h5 className="card-title mb-0 fs-15">SMS Configuration</h5>
                    <p className="text-muted mb-0 fs-13">Connect your SMS provider for text notifications</p>
                </div>
            </div>

            <div className="card-body p-3 p-sm-4">
                {isLoading || !form ? (
                    <FormLoader count={4} colClass="col-md-6" />
                ) : (
                    <>
                        <div className="d-flex align-items-start bg-info-subtle rounded-3 p-3 mb-4 gap-3">
                            <i className="ri-information-line fs-20 text-info"></i>
                            <p className="text-muted mb-0 fs-13">
                                Text messages for {isHost ? 'the platform and all certified partners' : 'your users'}, including
                                two-factor codes, are sent from this account. While it is disabled, no text messages are sent.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="mb-4 bg-primary-subtle rounded-3 p-3 d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2">
                                <div>
                                    <h6 className="mb-1 fw-bold fs-14 text-dark">SMS Status</h6>
                                    <p className="text-muted mb-0 fs-13">
                                        {form.is_enabled ? 'Texts are sent from this account.' : 'This account is not used for texts.'}
                                    </p>
                                </div>
                                <div className="form-check form-switch form-switch-lg mb-0">
                                    <input
                                        id="sms-enabled"
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        checked={form.is_enabled}
                                        onChange={(e) => update('is_enabled', e.target.checked)}
                                        disabled={save.isPending}
                                    />
                                    <label className="form-check-label fs-13" htmlFor="sms-enabled">
                                        Enable SMS
                                    </label>
                                </div>
                            </div>

                            <div className="row g-4">
                                <SmsField id="sms-country" label="Country" required error={errors.country}>
                                    <div className="flex-grow-1">
                                        <Dropdown
                                            inputId="sms-country"
                                            value={form.country}
                                            options={countries}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={(e: DropdownChangeEvent) => handleCountryChange(e.value)}
                                            placeholder="Select Country"
                                            className={`w-100 rounded-start-0 ${errors.country ? 'p-invalid' : ''}`}
                                            disabled={save.isPending}
                                        />
                                    </div>
                                </SmsField>

                                <SmsField id="sms-provider" label="Provider" required error={errors.provider}>
                                    <div className="flex-grow-1">
                                        <Dropdown
                                            inputId="sms-provider"
                                            value={form.provider}
                                            options={providers}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={(e: DropdownChangeEvent) => update('provider', e.value)}
                                            placeholder="Select Provider"
                                            className={`w-100 rounded-start-0 ${errors.provider ? 'p-invalid' : ''}`}
                                            disabled={save.isPending}
                                        />
                                    </div>
                                </SmsField>

                                <SmsField id="sms-account-sid" label="Account SID" required error={errors.account_sid}>
                                    <input
                                        id="sms-account-sid"
                                        type="text"
                                        className={`form-control fs-14 ${errors.account_sid ? 'is-invalid' : ''}`}
                                        value={form.account_sid}
                                        onChange={(e) => update('account_sid', e.target.value.trim())}
                                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        autoComplete="off"
                                    />
                                </SmsField>

                                <SmsField id="sms-auth-token" label="Auth Token" required error={errors.auth_token}>
                                    <input
                                        id="sms-auth-token"
                                        type="password"
                                        className={`form-control fs-14 ${errors.auth_token ? 'is-invalid' : ''}`}
                                        value={form.auth_token}
                                        onChange={(e) => update('auth_token', e.target.value)}
                                        placeholder={tokenSaved ? 'Saved - leave blank to keep' : 'Your Twilio auth token'}
                                        autoComplete="new-password"
                                    />
                                </SmsField>

                                <SmsField
                                    id="sms-from-number"
                                    label="From Number"
                                    required={!form.messaging_service_sid}
                                    error={errors.from_number}
                                    help="Your Twilio number, e.g. +15551234567."
                                >
                                    <input
                                        id="sms-from-number"
                                        type="tel"
                                        className={`form-control fs-14 ${errors.from_number ? 'is-invalid' : ''}`}
                                        value={form.from_number}
                                        onChange={(e) => update('from_number', e.target.value.trim())}
                                        placeholder="+15551234567"
                                    />
                                </SmsField>

                                <SmsField
                                    id="sms-messaging-service"
                                    label="Messaging Service SID"
                                    error={errors.messaging_service_sid}
                                    help="Optional. Used instead of the from number when set (A2P 10DLC)."
                                >
                                    <input
                                        id="sms-messaging-service"
                                        type="text"
                                        className={`form-control fs-14 ${errors.messaging_service_sid ? 'is-invalid' : ''}`}
                                        value={form.messaging_service_sid}
                                        onChange={(e) => update('messaging_service_sid', e.target.value.trim())}
                                        placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        autoComplete="off"
                                    />
                                </SmsField>
                            </div>

                            <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                                <button
                                    type="submit"
                                    className="btn btn-primary px-4 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 w-100 w-sm-auto"
                                    disabled={save.isPending}
                                >
                                    {save.isPending ? (
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    ) : (
                                        <i className="ri-save-2-line fs-18"></i>
                                    )}
                                    <span>Save Configuration</span>
                                </button>
                            </div>
                        </form>

                        <TestSmsPanel canTest={Boolean(configuration?.account_sid && tokenSaved)} />
                    </>
                )}
            </div>
        </div>
    );
};

export default SmsConfigurationForm;
