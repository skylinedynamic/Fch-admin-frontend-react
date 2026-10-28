import React, { useEffect, useState } from 'react';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import DynamicActionModal from '../../../../components/Common/Modals/DynamicActionModal';
import type {
    MailConfiguration,
    MailConfigurationActionResponse,
    MailProviderOption,
    SaveMailConfigurationPayload,
} from '../../../../modules/settings/types';
import emailConfigLogo from '../../../../../assets/images/email_config_logo.png';
import { apiErrorMessage, apiFieldErrors } from '../SmsConfiguration/apiErrors';
import MailSettingsFields from './MailSettingsFields';
import MailVerificationPanel from './MailVerificationPanel';
import { isMailFormChanged, toMailFormState, toMailPayload, type MailFormState } from './mailForm';

const PROVIDER_ICONS: Record<string, string> = { smtp: '📧', aws_ses: '🚀' };

interface MailConfigurationCardProps {
    idPrefix: string;
    /** The accessible name of the card. */
    regionLabel: string;
    title: string;
    subtitle: string;
    bannerTitle: string;
    bannerText: string;
    /** Which settings mail goes out with, shown under the banner. */
    notice?: React.ReactNode;
    providers: MailProviderOption[];
    /** The saved providers, one configuration each. */
    configurations: MailConfiguration[];
    save: (payload: SaveMailConfigurationPayload) => Promise<{ message?: string }>;
    sendCode: (configuration: MailConfiguration) => Promise<MailConfigurationActionResponse>;
    verify: (configuration: MailConfiguration, code: string) => Promise<unknown>;
    /** Choosing which verified provider sends. */
    makeDefault?: (configuration: MailConfiguration) => Promise<unknown>;
    /** Opens Test Mail; the button shows only when given. */
    onTestMail?: () => void;
}

/**
 * Email Configuration: pick a provider from the dropdown, fill in its
 * settings, save, then verify them with the code sent through them. Each
 * provider is kept and verified on its own.
 */
const MailConfigurationCard: React.FC<MailConfigurationCardProps> = ({
    idPrefix,
    regionLabel,
    title,
    subtitle,
    bannerTitle,
    bannerText,
    notice,
    providers,
    configurations,
    save,
    sendCode,
    verify,
    makeDefault,
    onTestMail,
}) => {
    const initial = configurations.find((c) => c.is_default)?.provider ?? configurations[0]?.provider ?? providers[0]?.value ?? '';
    const [selected, setSelected] = useState(initial);
    const provider = providers.find((p) => p.value === selected);
    const configuration = configurations.find((c) => c.provider === selected) ?? null;

    const [form, setForm] = useState<MailFormState>(() => toMailFormState(provider, configuration));
    // What the form held when last loaded, to tell whether it was changed.
    const [savedForm, setSavedForm] = useState<MailFormState>(form);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [switching, setSwitching] = useState(false);
    const [confirmDefault, setConfirmDefault] = useState(false);
    // A provider picked from the dropdown, waiting on the confirmation.
    const [pendingProvider, setPendingProvider] = useState<string | null>(null);

    // The chosen provider's saved settings, shown as saved (any typed secret
    // cleared) - after switching provider, saving or verifying.
    useEffect(() => {
        const next = toMailFormState(provider, configuration, configuration ? {} : { from_address: form.from_address, bcc_emails: form.bcc_emails });
        setForm(next);
        setSavedForm(next);
        setErrors({});
    }, [selected, configuration?.id, configuration?.updated_at, configuration?.is_verified]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!provider) {
        return null;
    }

    const providerName = (value: string | null) => providers.find((p) => p.value === value)?.label ?? '';

    const label = (value: string) => {
        const option = providers.find((p) => p.value === value);
        return option ? `${PROVIDER_ICONS[value] ?? '✉️'} ${option.label}` : value;
    };

    const savedSecrets: Record<string, boolean> = Object.fromEntries(
        provider.fields.filter((f) => f.secret).map((f) => [f.key, Boolean(configuration?.[`has_${f.key}`])])
    );

    // Saving changed settings throws away their verification (the API checks
    // the settings against those the code went through).
    const formChanged = isMailFormChanged(form, savedForm);
    const needsReverifying = Boolean(configuration?.is_verified) && formChanged;
    // Verified settings, unchanged, have nothing to save: Save Configuration
    // comes on once something is changed (a field edited, a secret typed).
    const nothingToSave = Boolean(configuration?.is_verified) && !formChanged;

    const update = (field: string, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
        if (errors[field]) {
            const { [field]: _removed, ...rest } = errors;
            setErrors(rest);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setSaving(true);
        try {
            const response = await save(toMailPayload(provider, form));
            toast.success(response.message ?? 'Configuration saved successfully.');
        } catch (err) {
            const fieldErrors = apiFieldErrors(err);
            if (fieldErrors) {
                setErrors(fieldErrors);
            } else {
                toast.error(apiErrorMessage(err, 'Failed to save configuration.'));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleMakeDefault = async () => {
        if (!makeDefault || !configuration) return;
        setConfirmDefault(false);
        setSwitching(true);
        try {
            await makeDefault(configuration);
            toast.success(`Mail is now sent with ${provider.label}.`);
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Failed to change the email provider.'));
        } finally {
            setSwitching(false);
        }
    };

    return (
        <>
            <div className="card email-config-form" role="region" aria-label={regionLabel}>
                <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                    <div className="avatar-sm flex-shrink-0">
                        <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
                            <i className="ri-mail-send-line"></i>
                        </div>
                    </div>
                    <div>
                        <h5 className="card-title mb-0 fs-15">{title}</h5>
                        <p className="text-muted mb-0 fs-13">{subtitle}</p>
                    </div>
                </div>

                <div className="card-body p-3 p-sm-4">
                    {notice}

                    <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center bg-info-subtle rounded-3 p-3 mb-4 gap-3">
                        <div className="flex-shrink-0">
                            <img src={emailConfigLogo} alt="" style={{ height: '55px', objectFit: 'contain', maxWidth: '80px' }} />
                        </div>
                        <div className="flex-grow-1">
                            <h6 className="mb-1 text-dark fw-semibold fs-14">{bannerTitle}</h6>
                            <p className="text-muted mb-0 fs-13">{bannerText}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave} noValidate>
                        <div className="mb-4 bg-primary-subtle rounded-3 p-3">
                            <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2">
                                <div>
                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                        <h6 className="mb-0 fw-bold fs-14 text-dark">Email Provider</h6>
                                        {configuration ? (
                                            configuration.is_verified ? (
                                                <span className="badge bg-success-subtle text-success">Verified</span>
                                            ) : (
                                                <span className="badge bg-warning-subtle text-warning">Not verified</span>
                                            )
                                        ) : (
                                            <span className="badge bg-secondary-subtle text-secondary">Not saved</span>
                                        )}
                                        {makeDefault && configuration?.is_default && (
                                            <span className="badge bg-primary text-white">Default</span>
                                        )}
                                    </div>
                                    <p className="text-muted mb-0 fs-13">
                                        Currently configuring <strong>{provider.label}</strong> configuration.
                                    </p>
                                    {/* The configuration mail goes out with says this in its delivery
                                        status; only another verified provider needs it here. */}
                                    {configuration?.is_verified && configuration.verified_to && makeDefault && !configuration.is_default && (
                                        <p className="text-muted mb-0 fs-12">Verified with a code sent to {configuration.verified_to}.</p>
                                    )}
                                </div>
                                <div className="d-flex flex-column align-items-stretch align-items-sm-end gap-2 flex-shrink-0" style={{ minWidth: '170px', width: '100%', maxWidth: '220px' }}>
                                    <label htmlFor={`${idPrefix}-provider`} className="visually-hidden">Email provider</label>
                                    <Dropdown
                                        inputId={`${idPrefix}-provider`}
                                        value={selected}
                                        options={providers.map((p) => ({ label: label(p.value), value: p.value }))}
                                        onChange={(e: DropdownChangeEvent) => {
                                            if (e.value !== selected) setPendingProvider(e.value);
                                        }}
                                        placeholder="Select Provider"
                                        className="w-100"
                                        disabled={saving || switching}
                                    />
                                    {makeDefault && configuration?.is_verified && !configuration.is_default && (
                                        <button type="button" className="btn btn-soft-primary btn-sm" disabled={switching}
                                            onClick={() => setConfirmDefault(true)}>
                                            Use this provider
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {needsReverifying && (
                            <div className="reverify-warning alert alert-warning d-flex align-items-start gap-2 mb-4" role="status">
                                <i className="ri-refresh-line fs-18"></i>
                                <p className="mb-0 fs-13">
                                    You changed these verified settings. After saving, they must be verified again
                                    {configuration?.is_default
                                        ? ' - until then all mail will be sent using the fallback mail configuration.'
                                        : ' before mail can be sent with them.'}
                                </p>
                            </div>
                        )}

                        <MailSettingsFields
                            idPrefix={idPrefix}
                            provider={provider}
                            form={form}
                            errors={errors}
                            savedSecrets={savedSecrets}
                            disabled={saving}
                            onChange={update}
                        />

                        <div className="row mt-5 pt-3 border-top">
                            <div className="col-12">
                                <div className="d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                                    {onTestMail && (
                                        <button
                                            type="button"
                                            className="btn btn-soft-primary px-4 py-2 fw-bold d-flex align-items-center justify-content-center flex-nowrap text-nowrap gap-2 w-100 w-sm-auto"
                                            onClick={onTestMail}
                                        >
                                            <i className="ri-mail-send-line fs-18" aria-hidden="true"></i>
                                            <span>Test Mail</span>
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="btn btn-primary px-4 py-2 fw-bold d-flex align-items-center justify-content-center flex-nowrap text-nowrap gap-2 shadow-sm w-100 w-sm-auto"
                                        disabled={saving || nothingToSave}
                                        title={nothingToSave ? 'These settings are verified. Change a setting to save it.' : undefined}
                                    >
                                        {saving && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
                                        <i className="ri-save-2-line fs-18"></i>
                                        <span>{saving ? 'Saving Configuration ...' : 'Save Configuration'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {configuration && !configuration.is_verified && (
                        <MailVerificationPanel
                            key={`${configuration.id}-${configuration.updated_at}`}
                            id={`${idPrefix}-verify`}
                            idPrefix={idPrefix}
                            sendCode={() => sendCode(configuration)}
                            verify={(code) => verify(configuration, code)}
                        />
                    )}
                </div>
            </div>

            <DynamicActionModal
                show={pendingProvider !== null}
                title="Confirm Provider Change"
                description={
                    <>
                        You are about to switch the email provider to <strong>{providerName(pendingProvider)}</strong>.
                    </>
                }
                warningText="Please ensure your credentials for the new provider are correct. Incorrect settings will prevent emails from being sent."
                warningBgClass="bg-info-subtle border-start border-3 border-info"
                imgSrc={emailConfigLogo}
                confirmText={`Yes, Change to ${providerName(pendingProvider)}`}
                confirmBtnClass="btn-primary"
                onClose={() => setPendingProvider(null)}
                onConfirm={() => {
                    if (pendingProvider) setSelected(pendingProvider);
                    setPendingProvider(null);
                }}
            />

            {makeDefault && (
                <DynamicActionModal
                    show={confirmDefault}
                    title="Send Mail With This Provider"
                    description={<>Mail will be sent with <strong>{provider.label}</strong> from now on.</>}
                    warningText="These settings are verified, so mail will go out through them straight away."
                    warningBgClass="bg-info-subtle border-start border-3 border-info"
                    imgSrc={emailConfigLogo}
                    confirmText={`Yes, Send with ${provider.label}`}
                    confirmBtnClass="btn-primary"
                    onClose={() => setConfirmDefault(false)}
                    onConfirm={handleMakeDefault}
                />
            )}
        </>
    );
};

export default MailConfigurationCard;
