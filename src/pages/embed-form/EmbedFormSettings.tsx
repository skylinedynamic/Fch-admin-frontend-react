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
    const [copied, setCopied] = useState<'snippet' | 'url' | null>(null);

    const loadConfig = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getEmbedFormConfig();
            if (res.status) {
                const d = res.data;
                setConfig(d);
                setFormTitle(d.form_title || '');
                setNotificationEmail(d.notification_email || '');
                setIsActive(d.is_active);
                setAllowedDomains(d.allowed_domains || []);
            }
        } catch {
            toast.error('Failed to load embed form configuration.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadConfig(); }, [loadConfig]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await updateEmbedFormConfig({
                form_title: formTitle,
                notification_email: notificationEmail || undefined,
                is_active: isActive,
                allowed_domains: allowedDomains,
            });
            if (res.status) {
                toast.success('Configuration saved successfully.');
                loadConfig();
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to save configuration.');
        } finally {
            setSaving(false);
        }
    };

    const handleRegenerate = async () => {
        if (!window.confirm('Regenerating the key will invalidate the current embed snippet. All existing embeds must be updated. Continue?')) return;
        setRegenerating(true);
        try {
            const res = await regenerateEmbedKey();
            if (res.status) {
                toast.success('Embed key regenerated. Update your website embed code.');
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
        if (allowedDomains.includes(d)) { toast.warn('Domain already added.'); return; }
        setAllowedDomains(prev => [...prev, d]);
        setDomainInput('');
    };

    const handleRemoveDomain = (domain: string) => {
        setAllowedDomains(prev => prev.filter(d => d !== domain));
    };

    const copyText = (text: string, type: 'snippet' | 'url') => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(type);
            setTimeout(() => setCopied(null), 2500);
        });
    };

    if (loading) {
        return (
            <div>
                <PageHeader title="Embed Form Settings" description="Configure your embeddable loan application form." />
                <div className="text-center p-5"><i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }} /></div>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Embed Form Settings"
                description="Generate your embed code and configure the loan application form for your website."
                breadcrumb={[{ label: 'Settings' }, { label: 'Embed Form' }]}
            />

            <div className="row g-4">
                {/* LEFT — Settings */}
                <div className="col-lg-7">

                    {/* Status & Stats */}
                    <div className="row g-3 mb-4">
                        {[
                            { label: 'Total Submissions', value: config?.submissions_count ?? 0, icon: 'ri-file-list-3-line', color: '#1a56db' },
                            { label: 'Form Status', value: isActive ? 'Active' : 'Inactive', icon: 'ri-checkbox-circle-line', color: isActive ? '#0e9f6e' : '#e02424' },
                        ].map((s) => (
                            <div className="col-sm-6" key={s.label}>
                                <div className="card shadow-none border h-100">
                                    <div className="card-body d-flex align-items-center gap-3 p-3">
                                        <div style={{ width: 44, height: 44, borderRadius: 10, background: s.color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <i className={s.icon} style={{ fontSize: 22, color: s.color }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                                            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Form Config */}
                    <div className="card shadow-none border mb-4">
                        <div className="card-header bg-white border-bottom py-3">
                            <h5 className="mb-0 fw-bold" style={{ fontSize: 15 }}>Form Configuration</h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="mb-3">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Form Title</label>
                                <input
                                    className="form-control"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="e.g. Personal Loan Application"
                                />
                                <small className="text-muted">Displayed at the top of your embed form.</small>
                            </div>
                            <div className="mb-3">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Notification Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={notificationEmail}
                                    onChange={(e) => setNotificationEmail(e.target.value)}
                                    placeholder="notifications@yourcompany.com"
                                />
                                <small className="text-muted">Email to receive alerts when a new application is submitted. Leave blank to use your account email.</small>
                            </div>
                            <div className="mb-3">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Form Status</label>
                                <div className="d-flex gap-3 align-items-center">
                                    <div className="form-check form-switch mb-0">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="isActiveSwitch"
                                            checked={isActive}
                                            onChange={(e) => setIsActive(e.target.checked)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <label className="form-check-label fw-medium" htmlFor="isActiveSwitch" style={{ cursor: 'pointer' }}>
                                            {isActive ? '✅ Accepting Submissions' : '⛔ Form Disabled'}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Allowed Domains */}
                            <div className="mb-4">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Allowed Domains <small className="text-muted fw-normal">(optional CORS restriction)</small></label>
                                <div className="d-flex gap-2 mb-2">
                                    <input
                                        className="form-control form-control-sm"
                                        value={domainInput}
                                        onChange={(e) => setDomainInput(e.target.value)}
                                        placeholder="https://yourwebsite.com"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                                    />
                                    <button className="btn btn-outline-primary btn-sm" onClick={handleAddDomain}>Add</button>
                                </div>
                                {allowedDomains.length > 0 && (
                                    <div className="d-flex flex-wrap gap-2 mt-1">
                                        {allowedDomains.map((d) => (
                                            <span key={d} className="badge rounded-pill d-flex align-items-center gap-1" style={{ background: '#ebf0fe', color: '#1a56db', fontSize: 12, fontWeight: 500, padding: '5px 10px' }}>
                                                {d}
                                                <button type="button" className="btn-close btn-close-sm ms-1" onClick={() => handleRemoveDomain(d)} style={{ fontSize: 9 }} />
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <small className="text-muted">Add domains authorized to embed this form (e.g. your partner's website). Leave empty to allow from any domain.</small>
                            </div>

                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : <><i className="ri-save-line me-2" />Save Configuration</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT — Embed Code */}
                <div className="col-lg-5">
                    <div className="card shadow-none border mb-4" style={{ position: 'sticky', top: 20 }}>
                        <div className="card-header bg-white border-bottom py-3">
                            <h5 className="mb-0 fw-bold" style={{ fontSize: 15 }}>🔗 Embed Code & Direct Link</h5>
                        </div>
                        <div className="card-body p-4">
                            {/* Public key */}
                            <div className="mb-4 p-3 rounded" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Partner Public Key</div>
                                <code style={{ fontSize: 12, color: '#1a56db', wordBreak: 'break-all' }}>{config?.public_key}</code>
                            </div>

                            {/* Direct URL */}
                            <div className="mb-4">
                                <label className="form-label fw-semibold" style={{ fontSize: 12, textTransform: 'uppercase', color: '#374151' }}>Shareable Form URL</label>
                                <div className="d-flex gap-2">
                                    <input className="form-control form-control-sm" readOnly value={config?.direct_url ?? ''} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                                    <button
                                        className={`btn btn-sm ${copied === 'url' ? 'btn-success' : 'btn-outline-secondary'}`}
                                        style={{ whiteSpace: 'nowrap' }}
                                        onClick={() => copyText(config?.direct_url, 'url')}
                                    >
                                        {copied === 'url' ? '✓ Copied' : 'Copy'}
                                    </button>
                                </div>
                                <small className="text-muted">Share this URL directly with your clients to fill the application.</small>
                            </div>

                            {/* Embed snippet */}
                            <div className="mb-4">
                                <label className="form-label fw-semibold" style={{ fontSize: 12, textTransform: 'uppercase', color: '#374151' }}>Website Embed Snippet</label>
                                <div className="position-relative">
                                    <textarea
                                        className="form-control"
                                        readOnly
                                        value={config?.embed_snippet ?? ''}
                                        rows={4}
                                        style={{ fontFamily: 'monospace', fontSize: 11.5, resize: 'none', background: '#f8f9fa' }}
                                    />
                                </div>
                                <button
                                    className={`btn btn-sm mt-2 w-100 ${copied === 'snippet' ? 'btn-success' : 'btn-outline-primary'}`}
                                    onClick={() => copyText(config?.embed_snippet, 'snippet')}
                                >
                                    {copied === 'snippet' ? '✓ Copied!' : <><i className="ri-code-s-slash-line me-1" />Copy Embed Code</>}
                                </button>
                                <small className="text-muted">Paste this `&lt;iframe&gt;` code anywhere in your website HTML.</small>
                            </div>

                            {/* Regenerate key */}
                            <div className="border-top pt-3">
                                <p style={{ fontSize: 12, color: '#6b7280' }}>
                                    ⚠️ Regenerating the key invalidates the existing embed snippet. Update your website after regenerating.
                                </p>
                                <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={handleRegenerate}
                                    disabled={regenerating}
                                >
                                    {regenerating ? <><span className="spinner-border spinner-border-sm me-1" />Regenerating...</> : <><i className="ri-refresh-line me-1" />Regenerate Key</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
