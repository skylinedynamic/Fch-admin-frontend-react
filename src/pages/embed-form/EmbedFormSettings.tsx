import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import PageHeader from '../common/PageHeader';
import {
    getEmbedFormConfig,
    updateEmbedFormConfig,
    regenerateEmbedKey,
} from '../../modules/embed-form/services';

export default function EmbedFormSettings() {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    // Form state
    const [formTitle, setFormTitle] = useState('');
    const [notificationEmail, setNotificationEmail] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [domainInput, setDomainInput] = useState('');
    const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
    const [copied, setCopied] = useState<'snippet' | 'url' | 'key' | null>(null);

    const loadConfig = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getEmbedFormConfig();
            if (res.status) {
                const d = res.data;
                setConfig(d);
                setFormTitle(d.form_title || '');
                setNotificationEmail(d.notification_email || '');
                setIsActive(Boolean(d.is_active));
                setAllowedDomains(d.allowed_domains || []);
            }
        } catch {
            toast.error('Failed to load embed form configuration.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const res = await updateEmbedFormConfig({
                form_title: formTitle,
                notification_email: notificationEmail || undefined,
                is_active: isActive,
                allowed_domains: allowedDomains,
            });
            if (res.status) {
                toast.success('Embed form configuration saved successfully.');
                loadConfig();
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save configuration.');
        } finally {
            setSaving(false);
        }
    };

    const handleRegenerate = async () => {
        if (!window.confirm('Warning: Regenerating this key will invalidate your current embed code and shareable links. Existing embeds must be updated with the new code. Continue?')) {
            return;
        }
        setRegenerating(true);
        try {
            const res = await regenerateEmbedKey();
            if (res.status) {
                toast.success('Public embed key regenerated successfully.');
                loadConfig();
            }
        } catch {
            toast.error('Failed to regenerate key.');
        } finally {
            setRegenerating(false);
        }
    };

    const handleAddDomain = () => {
        const d = domainInput.trim();
        if (!d) return;
        if (allowedDomains.includes(d)) {
            toast.warning('Domain is already in the allowed list.');
            return;
        }
        setAllowedDomains(prev => [...prev, d]);
        setDomainInput('');
    };

    const handleRemoveDomain = (domain: string) => {
        setAllowedDomains(prev => prev.filter(d => d !== domain));
    };

    const copyToClipboard = (text: string, type: 'snippet' | 'url' | 'key') => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(type);
            toast.success(type === 'snippet' ? 'Embed code copied to clipboard!' : 'Copied to clipboard!');
            setTimeout(() => setCopied(null), 2500);
        });
    };

    if (loading) {
        return (
            <div className="page-content">
                <div className="container-fluid">
                    <PageHeader
                        title="Embedded Form"
                        breadcrumbs={[{ label: 'Embedded Form', path: '/embed-form/settings' }, { label: 'Configuration' }]}
                    />
                    <div className="row g-4">
                        <div className="col-12 text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Top Header */}
                <PageHeader
                    title="Form Configuration"
                    breadcrumbs={[
                        { label: 'Embedded Form', path: '/embed-form/settings' },
                        { label: 'Configuration' }
                    ]}
                />

                {/* Main Content Grid */}
                <div className="row g-4">
                    {/* Left Column: Form Settings */}
                    <div className="col-lg-7">
                        {/* Summary Metrics Row */}
                        <div className="row g-3 mb-4">
                            <div className="col-sm-6">
                                <div className="card shadow-sm border-0 mb-0">
                                    <div className="card-body p-3 d-flex align-items-center gap-3">
                                        <div
                                            className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary"
                                            style={{ width: '48px', height: '48px' }}
                                        >
                                            <i className="ri-file-list-3-line fs-22" />
                                        </div>
                                        <div>
                                            <div className="text-muted text-uppercase fw-semibold fs-11">Total Submissions</div>
                                            <div className="fs-20 fw-bold text-dark">{config?.submissions_count ?? 0}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-sm-6">
                                <div className="card shadow-sm border-0 mb-0">
                                    <div className="card-body p-3 d-flex align-items-center gap-3">
                                        <div
                                            className={`avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center rounded-3 ${
                                                isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                                            }`}
                                            style={{ width: '48px', height: '48px' }}
                                        >
                                            <i className={isActive ? 'ri-checkbox-circle-line fs-22' : 'ri-close-circle-line fs-22'} />
                                        </div>
                                        <div>
                                            <div className="text-muted text-uppercase fw-semibold fs-11">Form Status</div>
                                            <div className="fs-16 fw-bold">
                                                <span className={`badge ${isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} fs-12`}>
                                                    {isActive ? 'Accepting Submissions' : 'Disabled'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Configuration Form Card */}
                        <form onSubmit={handleSave}>
                            <div className="card shadow-sm border-0 mb-4">
                                <div className="card-header bg-transparent border-bottom pb-3 pt-4 px-4">
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-sm me-3">
                                            <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-20">
                                                <i className="ri-settings-3-line" />
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="card-title mb-1 fw-bold">Form Configuration</h5>
                                            <p className="text-muted mb-0 fs-13">Configure the title, notifications, and security for your embedded form</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-body p-4">
                                    {/* Form Title */}
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold fs-13">
                                            Form Title <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light text-muted" style={{ width: '42px' }}>
                                                <i className="ri-t-box-line" />
                                            </span>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formTitle}
                                                onChange={(e) => setFormTitle(e.target.value)}
                                                placeholder="e.g. Personal Loan Application"
                                                required
                                            />
                                        </div>
                                        <div className="form-text fs-12 text-muted">
                                            This title appears as the main heading on the public application form.
                                        </div>
                                    </div>

                                    {/* Notification Email */}
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold fs-13">Notification Email Address</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light text-muted" style={{ width: '42px' }}>
                                                <i className="ri-mail-line" />
                                            </span>
                                            <input
                                                type="email"
                                                className="form-control"
                                                value={notificationEmail}
                                                onChange={(e) => setNotificationEmail(e.target.value)}
                                                placeholder="notifications@yourcompany.com"
                                            />
                                        </div>
                                        <div className="form-text fs-12 text-muted">
                                            Alert emails with full applicant details will be sent here upon submission. If left blank, your account email is used.
                                        </div>
                                    </div>

                                    {/* Form Active Switch */}
                                    <div className="mb-4 pt-2">
                                        <label className="form-label fw-semibold fs-13 d-block">Form Status</label>
                                        <div className="form-check form-switch form-switch-md">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="formStatusSwitch"
                                                checked={isActive}
                                                onChange={(e) => setIsActive(e.target.checked)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <label className="form-check-label ms-2 fw-medium fs-13" htmlFor="formStatusSwitch" style={{ cursor: 'pointer' }}>
                                                {isActive ? (
                                                    <span className="text-success fw-bold">Active &mdash; Public link & iframe are accepting submissions</span>
                                                ) : (
                                                    <span className="text-danger fw-bold">Disabled &mdash; Public form will show an inactive message</span>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    <hr className="my-4 text-muted opacity-25" />

                                    {/* Allowed Domains */}
                                    <div className="mb-4">
                                        <label className="form-label fw-semibold fs-13">
                                            Allowed Domains <small className="text-muted fw-normal">(Optional Security Restriction)</small>
                                        </label>
                                        <div className="input-group mb-2">
                                            <span className="input-group-text bg-light text-muted" style={{ width: '42px' }}>
                                                <i className="ri-global-line" />
                                            </span>
                                            <input
                                                type="url"
                                                className="form-control"
                                                value={domainInput}
                                                onChange={(e) => setDomainInput(e.target.value)}
                                                placeholder="https://yourwebsite.com"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddDomain();
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="btn text-white fw-semibold"
                                                style={{ backgroundColor: 'var(--secondary-color)', borderColor: 'var(--secondary-color)' }}
                                                onClick={handleAddDomain}
                                            >
                                                <i className="ri-add-line me-1" /> Add Domain
                                            </button>
                                        </div>

                                        {allowedDomains.length > 0 ? (
                                            <div className="d-flex flex-wrap gap-2 mt-2">
                                                {allowedDomains.map((domain) => (
                                                    <span
                                                        key={domain}
                                                        className="badge bg-primary-subtle text-primary border border-primary-subtle fs-12 px-3 py-2 d-inline-flex align-items-center gap-2 rounded-pill"
                                                    >
                                                        <i className="ri-shield-check-line" />
                                                        {domain}
                                                        <button
                                                            type="button"
                                                            className="btn-close btn-close-xs ms-1"
                                                            onClick={() => handleRemoveDomain(domain)}
                                                            aria-label="Remove"
                                                            style={{ fontSize: '8px' }}
                                                        />
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="form-text fs-12 text-muted">
                                                No restrictions specified. Form can be embedded on any authorized website.
                                            </div>
                                        )}
                                    </div>

                                    {/* Submit Button */}
                                    <div className="d-flex justify-content-end">
                                        <button
                                            type="submit"
                                            className="btn btn-primary px-4 fw-semibold"
                                            disabled={saving}
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                                                    Saving Changes...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="ri-save-line me-1" /> Save Configuration
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Right Column: Embed Snippet & Share Links */}
                    <div className="col-lg-5">
                        {/* Direct URL & Embed Code Card */}
                        <div className="card shadow-sm border-0 mb-4 sticky-top" style={{ top: '80px', zIndex: 10 }}>
                            <div className="card-header bg-transparent border-bottom pb-3 pt-4 px-4">
                                <div className="d-flex align-items-center">
                                    <div className="avatar-sm me-3">
                                        <div className="avatar-title bg-success-subtle text-success rounded-circle fs-20">
                                            <i className="ri-code-s-slash-line" />
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="card-title mb-1 fw-bold">Embed & Share</h5>
                                        <p className="text-muted mb-0 fs-13">Copy the integration code or direct link</p>
                                    </div>
                                </div>
                            </div>

                            <div className="card-body p-4">
                                {/* Partner Public Key */}
                                <div className="mb-4 p-3 bg-light rounded border">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <span className="text-muted fw-semibold fs-11 text-uppercase">Public Partner Key</span>
                                        <button
                                            type="button"
                                            className="btn btn-link btn-sm p-0 text-decoration-none fs-12 fw-semibold"
                                            style={{ color: 'var(--secondary-color)' }}
                                            onClick={() => copyToClipboard(config?.public_key, 'key')}
                                        >
                                            {copied === 'key' ? (
                                                <span className="text-success"><i className="ri-check-line me-1" />Copied</span>
                                            ) : (
                                                <span><i className="ri-file-copy-line me-1" />Copy Key</span>
                                            )}
                                        </button>
                                    </div>
                                    <code className="fs-12 text-primary text-break fw-semibold d-block">
                                        {config?.public_key || '—'}
                                    </code>
                                </div>

                                {/* Shareable Direct Link */}
                                <div className="mb-4">
                                    <label className="form-label fw-semibold fs-13">Direct Shareable Link</label>
                                    <div className="input-group mb-2">
                                        <input
                                            type="text"
                                            className="form-control bg-light fs-12 text-muted font-monospace"
                                            readOnly
                                            value={config?.direct_url || ''}
                                        />
                                        <button
                                            type="button"
                                            className={`btn text-white fw-semibold ${copied === 'url' ? 'btn-success' : ''}`}
                                            style={copied === 'url' ? undefined : { backgroundColor: 'var(--secondary-color)', borderColor: 'var(--secondary-color)' }}
                                            onClick={() => copyToClipboard(config?.direct_url, 'url')}
                                        >
                                            {copied === 'url' ? (
                                                <><i className="ri-check-line me-1" /> Copied</>
                                            ) : (
                                                <><i className="ri-file-copy-line me-1" /> Copy</>
                                            )}
                                        </button>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="form-text fs-12 text-muted">Send directly to your clients via SMS or email.</span>
                                        {config?.direct_url && (
                                            <a
                                                href={config.direct_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="fs-12 text-primary fw-semibold text-decoration-none"
                                            >
                                                Open <i className="ri-external-link-line ms-1" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* iFrame Embed Code */}
                                <div className="mb-4">
                                    <label className="form-label fw-semibold fs-13">Website &lt;iframe&gt; Embed Snippet</label>
                                    <div className="position-relative">
                                        <textarea
                                            className="form-control bg-light font-monospace fs-12 text-dark p-3"
                                            rows={4}
                                            readOnly
                                            value={config?.embed_snippet || ''}
                                            style={{ resize: 'none' }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className={`btn w-100 mt-2 fw-semibold text-white ${copied === 'snippet' ? 'btn-success' : ''}`}
                                        style={copied === 'snippet' ? undefined : { backgroundColor: 'var(--secondary-color)', borderColor: 'var(--secondary-color)' }}
                                        onClick={() => copyToClipboard(config?.embed_snippet, 'snippet')}
                                    >
                                        {copied === 'snippet' ? (
                                            <><i className="ri-check-line me-1" /> Embed Code Copied!</>
                                        ) : (
                                            <><i className="ri-code-box-line me-1" /> Copy Embed HTML</>
                                        )}
                                    </button>
                                    <div className="form-text fs-12 text-muted mt-2">
                                        Paste this code into WordPress, Webflow, Shopify, or any custom website.
                                    </div>
                                </div>

                                {/* Security / Key Regeneration Card */}
                                <div className="alert alert-warning border-0 p-3 mb-0" role="alert">
                                    <div className="d-flex align-items-start gap-2">
                                        <i className="ri-alert-line fs-18 text-warning flex-shrink-0 mt-1" />
                                        <div className="flex-grow-1">
                                            <h6 className="alert-heading fw-bold fs-13 mb-1">Key Management</h6>
                                            <p className="fs-12 text-muted mb-2">
                                                If you need to revoke existing embeds, you can regenerate your key.
                                            </p>
                                            <button
                                                type="button"
                                                className="btn btn-outline-danger btn-sm fw-semibold"
                                                onClick={handleRegenerate}
                                                disabled={regenerating}
                                            >
                                                {regenerating ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-1" />
                                                        Regenerating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="ri-refresh-line me-1" /> Regenerate Public Key
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
