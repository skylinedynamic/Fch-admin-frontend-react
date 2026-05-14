import React, { useState, useEffect } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { smtpEncryptionOptions } from '../../../config/emailConfiguration';
import {
    fetchEmailConfigurations,
    saveEmailConfiguration
} from '../../../modules/settings/services';

import { toast } from 'react-toastify';
import FormLoader from '../../../components/Loader/FormLoader';
import { useAuthStore } from '../../../store/auth/authStore';

export default function EmailConfigurationForm() {
    const user = useAuthStore((s) => s.user);
    const partnerId = user?.partner_id || user?.entity_id;

    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [configs, setConfigs] = useState([]);
    const [provider, setProvider] = useState('smtp');
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        enable_custom_configuration: false,
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
        from_name: '',
        bcc_emails: '',
        is_active: true
    });

    useEffect(() => {
        loadConfigs();
    }, []);

    const loadConfigs = async () => {
        try {
            setFetching(true);
            const res = await fetchEmailConfigurations(partnerId);
            // Handle both direct data array and nested data.data array from Laravel Resources accurately
            const configList = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
            
            if (configList && configList.length > 0) {
                setConfigs(configList);
                const current = configList[0]; // Take the first one for now
                setForm({
                    ...current,
                    enable_custom_configuration: Boolean(current.enable_custom_configuration),
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

    const handleSaveEmail = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setErrors({});
            
            await saveEmailConfiguration({
                ...form,
                email_provider: provider,
                partner_id: partnerId,
                is_active: true // Always ensure the saved config is active
            });

            toast.success('Configuration saved successfully.');
            loadConfigs();
        } catch (err) {
            if (err?.response?.status === 422) {
                setErrors(err.response.data.errors || {});
            } else {
                toast.error('Failed to save configuration.');
            }
        } finally {
            setSaving(false);
        }
    };

    if (fetching) return <FormLoader count={4} colClass="col-12" />;

    return (
        <div className="animate__animated animate__fadeIn">
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3 d-flex align-items-center gap-3">
                    <div className="avatar-sm flex-shrink-0">
                        <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
                            <i className="ri-mail-settings-line"></i>
                        </div>
                    </div>
                    <div>
                        <h5 className="card-title mb-0 fs-15">Email Configuration</h5>
                        <p className="text-muted mb-0 fs-13">Configure SMTP or AWS SES email settings</p>
                    </div>
                </div>

                <div className="card-body p-4">
                    <form onSubmit={handleSaveEmail}>
                        {/* CUSTOM CONFIG TOGGLE */}
                        <div className="mb-4 pb-3 border-bottom">
                            <div className="form-check form-switch form-switch-md mb-2">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="enable_custom_configuration"
                                    checked={form.enable_custom_configuration}
                                    onChange={(e) => setForm({ ...form, enable_custom_configuration: e.target.checked })}
                                />
                                <label className="form-check-label fw-semibold fs-14" htmlFor="enable_custom_configuration">
                                    Enable Custom Email Configuration
                                </label>
                            </div>
                            <p className="text-muted fs-12 mb-0">
                                If disabled, the system will use the host partner's default mail server.
                            </p>
                        </div>

                        {form.enable_custom_configuration && (
                            <div className="animate__animated animate__fadeIn">
                                {/* PROVIDER TABS */}
                                <div className="mb-4">
                                    <label className="form-label fw-semibold fs-13 text-muted text-uppercase mb-2">Email Provider</label>
                                    <div className="d-flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProvider('smtp');
                                                setErrors({});
                                            }}
                                            className={`btn btn-sm px-4 ${provider === 'smtp' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        >
                                            <i className="ri-server-line me-1"></i> SMTP
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProvider('aws_ses');
                                                setErrors({});
                                            }}
                                            className={`btn btn-sm px-4 ${provider === 'aws_ses' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        >
                                            <i className="ri-amazon-line me-1"></i> AWS SES
                                        </button>
                                    </div>
                                </div>

                                {/* SENDER INFO */}
                                <div className="row g-3 mb-4">
                                    <div className="col-md-6">
                                        <label className="form-label fs-13 fw-medium">From Address <span className="text-danger">*</span></label>
                                        <input
                                            type="email"
                                            className={`form-control ${errors.from_address ? 'is-invalid' : ''}`}
                                            value={form.from_address}
                                            onChange={(e) => setForm({ ...form, from_address: e.target.value })}
                                            placeholder="e.g. no-reply@yourdomain.com"
                                        />
                                        {errors.from_address && <div className="invalid-feedback">{errors.from_address}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fs-13 fw-medium">From Name <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.from_name ? 'is-invalid' : ''}`}
                                            value={form.from_name}
                                            onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                                            placeholder="e.g. Your Company Name"
                                        />
                                        {errors.from_name && <div className="invalid-feedback">{errors.from_name}</div>}
                                    </div>
                                </div>

                                {/* SMTP SETTINGS */}
                                {provider === 'smtp' && (
                                    <div className="row g-3 mb-4 animate__animated animate__fadeIn">
                                        <div className="col-md-9">
                                            <label className="form-label fs-13 fw-medium">SMTP Host <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.smtp_host ? 'is-invalid' : ''}`}
                                                value={form.smtp_host}
                                                onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                                                placeholder="e.g. smtp.mailtrap.io"
                                            />
                                            {errors.smtp_host && <div className="invalid-feedback">{errors.smtp_host}</div>}
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label fs-13 fw-medium">Port <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.smtp_port ? 'is-invalid' : ''}`}
                                                value={form.smtp_port}
                                                onChange={(e) => setForm({ ...form, smtp_port: e.target.value })}
                                                placeholder="e.g. 587"
                                            />
                                            {errors.smtp_port && <div className="invalid-feedback">{errors.smtp_port}</div>}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fs-13 fw-medium">Encryption <span className="text-danger">*</span></label>
                                            <Dropdown
                                                value={form.smtp_encryption}
                                                options={smtpEncryptionOptions}
                                                onChange={(e) => setForm({ ...form, smtp_encryption: e.value })}
                                                placeholder="Select Encryption"
                                                className={`w-100 ${errors.smtp_encryption ? 'p-invalid' : ''}`}
                                            />
                                            {errors.smtp_encryption && <div className="invalid-feedback d-block">{errors.smtp_encryption}</div>}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fs-13 fw-medium">Username <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.smtp_username ? 'is-invalid' : ''}`}
                                                value={form.smtp_username}
                                                onChange={(e) => setForm({ ...form, smtp_username: e.target.value })}
                                                placeholder="e.g. 333b2a141588f8"
                                            />
                                            {errors.smtp_username && <div className="invalid-feedback">{errors.smtp_username}</div>}
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fs-13 fw-medium">Password <span className="text-danger">*</span></label>
                                            <input
                                                type="password"
                                                className={`form-control ${errors.smtp_password ? 'is-invalid' : ''}`}
                                                value={form.smtp_password}
                                                onChange={(e) => setForm({ ...form, smtp_password: e.target.value })}
                                                placeholder="e.g. e5d9ae5ad4cd00"
                                            />
                                            {errors.smtp_password && <div className="invalid-feedback">{errors.smtp_password}</div>}
                                        </div>
                                    </div>
                                )}

                                {/* AWS SETTINGS */}
                                {provider === 'aws_ses' && (
                                    <div className="row g-3 mb-4 animate__animated animate__fadeIn">
                                        <div className="col-md-6">
                                            <label className="form-label fs-13 fw-medium">Access Key <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.aws_access_key ? 'is-invalid' : ''}`}
                                                value={form.aws_access_key}
                                                onChange={(e) => setForm({ ...form, aws_access_key: e.target.value })}
                                                placeholder="e.g. AKIAEXAMPLE123456"
                                            />
                                            {errors.aws_access_key && <div className="invalid-feedback">{errors.aws_access_key}</div>}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fs-13 fw-medium">Secret Key <span className="text-danger">*</span></label>
                                            <input
                                                type="password"
                                                className={`form-control ${errors.aws_secret_key ? 'is-invalid' : ''}`}
                                                value={form.aws_secret_key}
                                                onChange={(e) => setForm({ ...form, aws_secret_key: e.target.value })}
                                                placeholder="e.g. abcdEXAMPLEsecretKEY1234567890"
                                            />
                                            {errors.aws_secret_key && <div className="invalid-feedback">{errors.aws_secret_key}</div>}
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fs-13 fw-medium">Region <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.aws_region ? 'is-invalid' : ''}`}
                                                value={form.aws_region}
                                                onChange={(e) => setForm({ ...form, aws_region: e.target.value })}
                                                placeholder="e.g. ap-southeast-1"
                                            />
                                            {errors.aws_region && <div className="invalid-feedback">{errors.aws_region}</div>}
                                        </div>
                                    </div>
                                )}

                                {/* BCC & STATUS */}
                                <div className="row g-3 mb-4">
                                    <div className="col-12">
                                        <label className="form-label fs-13 fw-medium">BCC Emails (comma separated)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={form.bcc_emails}
                                            onChange={(e) => setForm({ ...form, bcc_emails: e.target.value })}
                                            placeholder="e.g. admin@yourdomain.com, log@yourdomain.com"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}


                        <div className="text-end pt-3 border-top mt-4">
                            <button type="submit" className="btn btn-primary px-5 shadow-sm" disabled={saving}>
                                {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="ri-save-line me-1"></i>Save Configuration</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}