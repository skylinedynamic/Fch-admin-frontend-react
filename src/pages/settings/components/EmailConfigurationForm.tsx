import React, { useState, useEffect } from 'react';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { smtpEncryptionOptions } from '../../../config/emailConfiguration';
import {
    fetchEmailConfigurations,
    saveEmailConfiguration
} from '../../../modules/settings/services';

import { toast } from 'react-toastify';
import { EmailConfigSkeleton } from '../../../components/Loader/SpecificSkeletons';
import { useAuthStore } from '../../../store/auth/authStore';
import { useQueryClient } from '@tanstack/react-query';
import DynamicActionModal from '../../../components/Common/Modals/DynamicActionModal';
import emailConfigLogo from "../../../../assets/images/email_config_logo.png";

interface EmailFormState {
    enable_custom_configuration: boolean;
    site_name: string;
    email_provider: string;
    smtp_driver: string;
    smtp_host: string;
    smtp_port: string;
    smtp_encryption: string;
    smtp_username: string;
    smtp_password: string;
    aws_access_key: string;
    aws_secret_key: string;
    aws_region: string;
    from_address: string;
    // from_name: string;
    bcc_emails: string;
    is_active: boolean;
    id?: number;
}

const EmailConfigurationForm: React.FC = () => {
    const user = useAuthStore((s) => s.user);
    const partnerId = user?.partner_id || user?.entity_id;
    const queryClient = useQueryClient();

    const [fetching, setFetching] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [pendingProvider, setPendingProvider] = useState<string | null>(null);
    const [provider, setProvider] = useState<string>('smtp');
    const [errors, setErrors] = useState<any>({});

    const [form, setForm] = useState<EmailFormState>({
        enable_custom_configuration: true,
        site_name: '',
        email_provider: 'smtp',
        smtp_driver: 'smtp',
        smtp_host: '',
        smtp_port: '',
        smtp_encryption: 'tls',
        smtp_username: '',
        smtp_password: '',
        aws_access_key: '',
        aws_secret_key: '',
        aws_region: '',
        from_address: '',
        // from_name: '',
        bcc_emails: '',
        is_active: true
    });

    useEffect(() => {
        loadConfigs();
    }, []);

    const loadConfigs = async () => {
        try {
            setFetching(true);
            const res: any = await fetchEmailConfigurations();
            const configList = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);

            if (configList && configList.length > 0) {
                const current = configList[0];
                setForm({
                    ...current,
                    enable_custom_configuration: true,
                    is_active: Boolean(current.is_active)
                });
                setProvider(current.email_provider || 'smtp');
            }
        } catch (error) {
            console.error('Email config load error:', error);
            toast.error('Failed to load configuration.');
        } finally {
            setFetching(false);
        }
    };

    const handleProviderChangeRequest = (newProvider: string) => {
        if (newProvider !== provider) {
            setPendingProvider(newProvider);
            setShowModal(true);
        }
    };

    const confirmProviderChange = () => {
        if (pendingProvider) {
            setProvider(pendingProvider);
            setErrors({});
        }
        setShowModal(false);
        setPendingProvider(null);
    };

    const cancelProviderChange = () => {
        setShowModal(false);
        setPendingProvider(null);
    };

    const handleSaveEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setErrors({});

            if (form.from_address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.from_address)) {
                setErrors({ from_address: 'The from address must be a valid email address.' });
                setSaving(false);
                return;
            }

            if (provider === 'smtp') {
                const port = Number(form.smtp_port);
                if (!form.smtp_port || !Number.isInteger(port) || port < 1 || port > 65535) {
                    setErrors({ smtp_port: 'The SMTP port must be a number between 1 and 65535.' });
                    setSaving(false);
                    return;
                }
            }

            const payload: any = {
                ...form,
                email_provider: provider,
                enable_custom_configuration: true,
                is_active: true
            };

            // Remove internal or un-rendered fields
            delete payload.id;
            if (!payload.site_name) {
                delete payload.site_name;
            }

            // Clean up provider-specific fields to prevent saving empty/irrelevant keys
            if (provider === 'smtp') {
                delete payload.aws_access_key;
                delete payload.aws_secret_key;
                delete payload.aws_region;
            } else if (provider === 'aws_ses') {
                delete payload.smtp_driver;
                delete payload.smtp_host;
                delete payload.smtp_port;
                delete payload.smtp_encryption;
                delete payload.smtp_username;
                delete payload.smtp_password;
            }

            await saveEmailConfiguration(payload);

            queryClient.invalidateQueries({ queryKey: ['globalConfigurations'] });
            toast.success('Configuration saved successfully.');
        } catch (err: any) {
            if (err?.response?.status === 422) {
                setErrors(err.response.data.errors || {});
            } else {
                toast.error('Failed to save configuration.');
            }
        } finally {
            setSaving(false);
        }
    };


    return (
        <>
            <div className="card email-config-form">
                <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                    <div className="avatar-sm flex-shrink-0">
                        <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
                            <i className="ri-mail-send-line"></i>
                        </div>
                    </div>
                    <div>
                        <h5 className="card-title mb-0 fs-15">Email Configuration</h5>
                        <p className="text-muted mb-0 fs-13">Configure SMTP or AWS SES email settings</p>
                    </div>
                </div>

                <div className="card-body p-3 p-sm-4">
                    {fetching ? (
                        <EmailConfigSkeleton />
                    ) : (
                        <>
                            {/* Info Banner */}
                            <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center bg-info-subtle rounded-3 p-3 mb-4 gap-3">
                                <div className="flex-shrink-0">
                                    <img src={emailConfigLogo} alt="Email Config Logo" style={{ height: '55px', objectFit: 'contain', maxWidth: '80px' }} />
                                </div>
                                <div className="flex-grow-1">
                                    <h6 className="mb-1 text-dark fw-semibold fs-14">Transactional Email Service</h6>
                                    <p className="text-muted mb-0 fs-13">
                                        Configure your system's outbound mail server. Connect via SMTP or AWS SES to ensure reliable delivery of receipts, notifications, and system alerts.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleSaveEmail}>
                                <div className="animate__animated animate__fadeIn">
                                    {/* EMAIL PROVIDER SELECTOR — matches Operating Environment panel design */}
                                    <div className="mb-4 bg-primary-subtle rounded-3 p-3">
                                        <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2">
                                            <div>
                                                <h6 className="mb-1 fw-bold fs-14 text-dark">Email Provider</h6>
                                                <p className="text-muted mb-0 fs-13">
                                                    Currently configuring <strong>{provider === 'aws_ses' ? 'AWS SES' : 'SMTP'}</strong> configuration.
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0" style={{ minWidth: '170px', width: '100%', maxWidth: '220px' }}>
                                                <Dropdown
                                                    value={provider}
                                                    options={[
                                                        { label: '📧 SMTP Server', value: 'smtp' },
                                                        { label: '🚀 AWS SES', value: 'aws_ses' }
                                                    ]}
                                                    onChange={(e: DropdownChangeEvent) => handleProviderChangeRequest(e.value)}
                                                    placeholder="Select Provider"
                                                    className="w-100"
                                                    disabled={saving}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row g-4 mb-4 animate__animated animate__fadeIn">
                                        {/* Common Settings */}
                                        <div className="col-md-6">
                                            <div className="input-group">
                                                <span className={`input-group-text bg-light text-muted fw-medium`} style={{ minWidth: '130px', justifyContent: 'center' }}>
                                                    From Address <span className="text-danger ms-1">*</span>
                                                </span>
                                                <input
                                                    type="email"
                                                    className={`form-control fs-14 ${errors.from_address ? 'is-invalid border-danger' : ''}`}
                                                    value={form.from_address}
                                                    onChange={(e) => {
                                                        setForm({ ...form, from_address: e.target.value });
                                                        if (errors.from_address) {
                                                            const newErrors = { ...errors };
                                                            delete newErrors.from_address;
                                                            setErrors(newErrors);
                                                        }
                                                    }}
                                                    placeholder="no-reply@domain.com"
                                                    style={{ boxShadow: 'none' }}
                                                />
                                            </div>
                                            {errors.from_address && <div className="text-danger small mt-1 ps-2"><i className="ri-error-warning-line me-1"></i>{errors.from_address}</div>}
                                        </div>

                                        {/* SMTP SETTINGS */}
                                        {provider === 'smtp' && (
                                            <>
                                                <div className="col-md-6">
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light text-muted fw-medium`} style={{ minWidth: '130px', justifyContent: 'center' }}>
                                                            SMTP Host <span className="text-danger ms-1">*</span>
                                                        </span>
                                                        <input
                                                            type="text"
                                                            className={`form-control fs-14 ${errors.smtp_host ? 'is-invalid border-danger' : ''}`}
                                                            value={form.smtp_host}
                                                            onChange={(e) => {
                                                                setForm({ ...form, smtp_host: e.target.value });
                                                                if (errors.smtp_host) {
                                                                    const newErrors = { ...errors };
                                                                    delete newErrors.smtp_host;
                                                                    setErrors(newErrors);
                                                                }
                                                            }}
                                                            placeholder="smtp.mailtrap.io"
                                                            style={{ boxShadow: 'none' }}
                                                        />
                                                    </div>
                                                    {errors.smtp_host && <div className="text-danger small mt-1 ps-2"><i className="ri-error-warning-line me-1"></i>{errors.smtp_host}</div>}
                                                </div>
                                                <div className="col-md-6">
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light text-muted fw-medium`} style={{ minWidth: '130px', justifyContent: 'center' }}>
                                                            Port <span className="text-danger ms-1">*</span>
                                                        </span>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            maxLength={5}
                                                            className={`form-control fs-14 ${errors.smtp_port ? 'is-invalid border-danger' : ''}`}
                                                            value={form.smtp_port}
                                                            onChange={(e) => {
                                                                const digitsOnly = e.target.value.replace(/\D/g, '');
                                                                setForm({ ...form, smtp_port: digitsOnly });
                                                                if (errors.smtp_port) {
                                                                    const newErrors = { ...errors };
                                                                    delete newErrors.smtp_port;
                                                                    setErrors(newErrors);
                                                                }
                                                            }}
                                                            placeholder="587"
                                                            style={{ boxShadow: 'none' }}
                                                        />
                                                    </div>
                                                    {errors.smtp_port && <div className="text-danger small mt-1 ps-2"><i className="ri-error-warning-line me-1"></i>{errors.smtp_port}</div>}
                                                </div>
                                                <div className="col-md-6">
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light text-muted fw-medium`} style={{ minWidth: '130px', justifyContent: 'center' }}>
                                                            Encryption <span className="text-danger ms-1">*</span>
                                                        </span>
                                                        <div className="flex-grow-1">
                                                            <Dropdown
                                                                value={form.smtp_encryption}
                                                                options={smtpEncryptionOptions}
                                                                onChange={(e: DropdownChangeEvent) => setForm({ ...form, smtp_encryption: e.value })}
                                                                placeholder="Select Encryption"
                                                                className={`w-100 rounded-start-0 ${errors.smtp_encryption ? 'p-invalid' : ''}`}
                                                            />
                                                        </div>
                                                    </div>
                                                    {errors.smtp_encryption && <div className="text-danger small mt-1 ps-2"><i className="ri-error-warning-line me-1"></i>{errors.smtp_encryption}</div>}
                                                </div>
                                                <div className="col-md-6">
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light text-muted fw-medium`} style={{ minWidth: '130px', justifyContent: 'center' }}>
                                                            Username <span className="text-danger ms-1">*</span>
                                                        </span>
                                                        <input
                                                            type="text"
                                                            className={`form-control fs-14 ${errors.smtp_username ? 'is-invalid border-danger' : ''}`}
                                                            value={form.smtp_username}
                                                            onChange={(e) => {
                                                                setForm({ ...form, smtp_username: e.target.value });
                                                                if (errors.smtp_username) {
                                                                    const newErrors = { ...errors };
                                                                    delete newErrors.smtp_username;
                                                                    setErrors(newErrors);
                                                                }
                                                            }}
                                                            placeholder="user@domain.com"
                                                            style={{ boxShadow: 'none' }}
                                                        />
                                                    </div>
                                                    {errors.smtp_username && <div className="text-danger small mt-1 ps-2"><i className="ri-error-warning-line me-1"></i>{errors.smtp_username}</div>}
                                                </div>
                                                <div className="col-md-6">
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light text-muted fw-medium`} style={{ minWidth: '130px', justifyContent: 'center' }}>
                                                            Password <span className="text-danger ms-1">*</span>
                                                        </span>
                                                        <input
                                                            type="password"
                                                            className={`form-control fs-14 ${errors.smtp_password ? 'is-invalid border-danger' : ''}`}
                                                            value={form.smtp_password}
                                                            onChange={(e) => {
                                                                setForm({ ...form, smtp_password: e.target.value });
                                                                if (errors.smtp_password) {
                                                                    const newErrors = { ...errors };
                                                                    delete newErrors.smtp_password;
                                                                    setErrors(newErrors);
                                                                }
                                                            }}
                                                            placeholder="........"
                                                            style={{ boxShadow: 'none' }}
                                                        />
                                                    </div>
                                                    {errors.smtp_password && <div className="text-danger small mt-1 ps-2"><i className="ri-error-warning-line me-1"></i>{errors.smtp_password}</div>}
                                                </div>
                                            </>
                                        )}

                                        {/* AWS SETTINGS */}
                                        {provider === 'aws_ses' && (
                                            <>
                                                <div className="col-md-6">
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light text-muted fw-medium`} style={{ minWidth: '130px', justifyContent: 'center' }}>
                                                            Access Key <span className="text-danger ms-1">*</span>
                                                        </span>
                                                        <input
                                                            type="text"
                                                            className={`form-control fs-14 ${errors.aws_access_key ? 'is-invalid border-danger' : ''}`}
                                                            value={form.aws_access_key}
                                                            onChange={(e) => setForm({ ...form, aws_access_key: e.target.value })}
                                                            placeholder="AKIAEXAMPLE..."
                                                            style={{ boxShadow: 'none' }}
                                                        />
                                                    </div>
                                                    {errors.aws_access_key && <div className="text-danger small mt-1 ps-2"><i className="ri-error-warning-line me-1"></i>{errors.aws_access_key}</div>}
                                                </div>
                                                <div className="col-md-6">
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light text-muted fw-medium`} style={{ minWidth: '130px', justifyContent: 'center' }}>
                                                            Secret Key <span className="text-danger ms-1">*</span>
                                                        </span>
                                                        <input
                                                            type="password"
                                                            className={`form-control fs-14 ${errors.aws_secret_key ? 'is-invalid border-danger' : ''}`}
                                                            value={form.aws_secret_key}
                                                            onChange={(e) => setForm({ ...form, aws_secret_key: e.target.value })}
                                                            placeholder="........"
                                                            style={{ boxShadow: 'none' }}
                                                        />
                                                    </div>
                                                    {errors.aws_secret_key && <div className="text-danger small mt-1 ps-2"><i className="ri-error-warning-line me-1"></i>{errors.aws_secret_key}</div>}
                                                </div>
                                                <div className="col-md-6">
                                                    <div className="input-group">
                                                        <span className={`input-group-text bg-light text-muted fw-medium`} style={{ minWidth: '130px', justifyContent: 'center' }}>
                                                            Region <span className="text-danger ms-1">*</span>
                                                        </span>
                                                        <input
                                                            type="text"
                                                            className={`form-control fs-14 ${errors.aws_region ? 'is-invalid border-danger' : ''}`}
                                                            value={form.aws_region}
                                                            onChange={(e) => setForm({ ...form, aws_region: e.target.value })}
                                                            placeholder="us-east-1"
                                                            style={{ boxShadow: 'none' }}
                                                        />
                                                    </div>
                                                    {errors.aws_region && <div className="text-danger small mt-1 ps-2"><i className="ri-error-warning-line me-1"></i>{errors.aws_region}</div>}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* BCC Emails */}
                                    {/* <div className="row g-4 mb-4">
                                    <div className="col-12">
                                        <div className="input-group">
                                            <span className={`input-group-text bg-light text-muted fw-medium`} style={{ minWidth: '130px', justifyContent: 'center' }}>
                                                BCC Emails
                                            </span>
                                            <input
                                                type="text"
                                                className="form-control fs-14"
                                                value={form.bcc_emails}
                                                onChange={(e) => setForm({ ...form, bcc_emails: e.target.value })}
                                                placeholder="admin@domain.com, log@domain.com"
                                                style={{ boxShadow: 'none' }}
                                            />
                                        </div>
                                    </div>
                                </div> */}
                                </div>

                                <div className="row mt-5 pt-3 border-top">
                                    <div className="col-12">
                                        <div className="d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                                            <button
                                                type="submit"
                                                className="btn btn-primary px-4 py-2 fw-bold d-flex align-items-center justify-content-center flex-nowrap text-nowrap gap-2 shadow-sm w-100 w-sm-auto"
                                                disabled={saving}
                                            >
                                                {saving ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                        <i className="ri-save-2-line fs-18"></i>
                                                        <span>Saving Configuration ...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="ri-save-2-line fs-18"></i>
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
                title="Confirm Provider Change"
                description={
                    <>
                        You are about to switch the email provider to <strong>{pendingProvider === 'aws_ses' ? 'AWS SES' : 'SMTP'}</strong>.
                    </>
                }
                warningText="Please ensure your credentials for the new provider are correct. Incorrect settings will prevent emails from being sent."
                warningBgClass="bg-info-subtle border-start border-3 border-info"
                imgSrc={emailConfigLogo}
                confirmText={`Yes, Change to ${pendingProvider === 'aws_ses' ? 'AWS SES' : 'SMTP'}`}
                confirmBtnClass="btn-primary"
                onClose={cancelProviderChange}
                onConfirm={confirmProviderChange}
            />
        </>
    );
};

export default EmailConfigurationForm;
