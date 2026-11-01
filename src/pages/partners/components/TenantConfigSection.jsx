import React, { useState, useEffect } from 'react';
import { getTenantConfig, updateTenantConfig, getMyTenantConfig, updateMyTenantConfig } from '../../../modules/partner/services';
import { toast } from 'react-toastify';
import TenantConfigLoader from '../../../components/Loader/TenantConfigLoader';

export default function TenantConfigSection({
    partnerId,
    setIsSaving,
    useCommonApi = false
}) {
    const [config, setConfig] = useState({
        active_custom_url: false,
        partner_domain: '',
        borrower_domain: '',
        partner_subdomain: '',
    });
    const [copiedState, setCopiedState] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (partnerId || useCommonApi) {
            fetchConfig();
        }
    }, [partnerId, useCommonApi]);

    const fetchConfig = async () => {
        if (!partnerId && !useCommonApi) return;
        setLoading(true);
        try {
            const response = useCommonApi ? await getMyTenantConfig() : await getTenantConfig(partnerId);
            // Robust unwrapping: handle Laravel resource wrapping + ApiResponse envelope
            const data = response?.data?.data || response?.data || response;

            if (data && typeof data === 'object') {
                setConfig({
                    active_custom_url: data.active_custom_url === true || data.active_custom_url === 1 || data.active_custom_url === '1',
                    partner_domain: data.partner_domain || '',
                    borrower_domain: data.borrower_domain || '',
                    partner_subdomain: data.partner_subdomain || '',
                });
            }
        } catch (error) {
            toast.error('Failed to fetch tenant configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleToggleChange = (e) => {
        const { name, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    const handleCopy = (text, type) => {
        if (!text) return;
        navigator.clipboard.writeText(text)
            .then(() => {
                setCopiedState(type);
                setTimeout(() => setCopiedState(''), 2000);
            })
            .catch(() => {});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        if (setIsSaving) setIsSaving(true);
        setErrors({});

        try {
            const payload = {
                ...config,
                partner_domain: config.partner_domain || null,
                borrower_domain: config.borrower_domain || null,
            };

            const response = useCommonApi
                ? await updateMyTenantConfig(payload)
                : await updateTenantConfig(partnerId, payload);

            const data = response?.data?.data || response?.data || response;
            if (data && typeof data === 'object') {
                setConfig({
                    active_custom_url: data.active_custom_url === true || data.active_custom_url === 1 || data.active_custom_url === '1',
                    partner_domain: data.partner_domain || '',
                    borrower_domain: data.borrower_domain || '',
                    partner_subdomain: data.partner_subdomain || '',
                });
            }

            toast.success('Tenant configuration updated successfully');
        } catch (error) {
            if (error.response?.status === 422) {
                // Each message shows under its field - no toast besides (BUG-121).
                setErrors(error.response.data.errors || {});
            } else {
                toast.error(error.response?.data?.message || 'Failed to update configuration');
            }
        } finally {
            setSaving(false);
            if (setIsSaving) setIsSaving(false);
        }
    };

    if (loading) {
        return <TenantConfigLoader />;
    }

    return (
        <form id="tenant-config-form" onSubmit={handleSubmit}>
            <div className="row g-3">
                {!config.active_custom_url && (
                    <div className="col-12 mb-2">
                        <div className="dns-panel">
                            {/* Partner Domain Row */}
                            <div className="dns-row">
                                <div className="dns-label-col">
                                    <div className="dns-icon-box dns-icon-box-partner">
                                        <i className="ri-global-line fs-15 text-primary"></i>
                                    </div>
                                    <span className="dns-label-text">Partner</span>
                                </div>

                                <div className="dns-value-col">
                                    {config.partner_subdomain ? (
                                        <>
                                            <div className="dns-badge dns-badge-partner">
                                                <span className="dns-pulse-dot"></span>
                                                <a
                                                    href={`https://${config.partner_subdomain}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="dns-link dns-link-partner"
                                                >
                                                    https://{config.partner_subdomain}
                                                </a>
                                            </div>
                                            <button
                                                type="button"
                                                className={`btn btn-sm border-0 dns-copy-btn ${copiedState === 'Partner URL' ? 'dns-copy-btn-partner-copied' : 'dns-copy-btn-partner'}`}
                                                onClick={() => handleCopy(`https://${config.partner_subdomain}`, 'Partner URL')}
                                                title="Copy URL"
                                            >
                                                <i className={copiedState === 'Partner URL' ? "ri-check-line fs-15" : "ri-file-copy-line fs-15"}></i>
                                            </button>
                                        </>
                                    ) : (
                                        <span className="dns-not-set">Domain not set yet</span>
                                    )}
                                </div>
                            </div>

                            {/* Borrower Domain Row */}
                            <div className="dns-row">
                                <div className="dns-label-col">
                                    <div className="dns-icon-box dns-icon-box-borrower">
                                        <i className="ri-user-settings-line fs-15 text-success"></i>
                                    </div>
                                    <span className="dns-label-text">Borrower</span>
                                </div>

                                <div className="dns-value-col">
                                    {config.borrower_domain ? (
                                        <>
                                            <div className="dns-badge dns-badge-borrower">
                                                <span className="dns-pulse-dot"></span>
                                                <a
                                                    href={`https://${config.borrower_domain}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="dns-link dns-link-borrower"
                                                >
                                                    https://{config.borrower_domain}
                                                </a>
                                            </div>
                                            <button
                                                type="button"
                                                className={`btn btn-sm border-0 dns-copy-btn ${copiedState === 'Borrower URL' ? 'dns-copy-btn-borrower-copied' : 'dns-copy-btn-borrower'}`}
                                                onClick={() => handleCopy(`https://${config.borrower_domain}`, 'Borrower URL')}
                                                title="Copy URL"
                                            >
                                                <i className={copiedState === 'Borrower URL' ? "ri-check-line fs-15" : "ri-file-copy-line fs-15"}></i>
                                            </button>
                                        </>
                                    ) : (
                                        <span className="dns-not-set">Domain not set yet</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="col-lg-12 mb-3">
                    <div className="form-check form-switch form-switch-lg custom-switch-primary">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="active_custom_url"
                            name="active_custom_url"
                            checked={config.active_custom_url}
                            onChange={handleToggleChange}
                        />
                        <label className="form-check-label fw-semibold ms-2 fs-15 text-primary" htmlFor="active_custom_url">
                            Activate Custom Domain
                        </label>
                    </div>
                    <p className="text-muted fs-13 mb-0 ms-4 ps-5">
                        Toggle this to enable or disable custom domain mapping for this partner's white-label portals.
                    </p>
                </div>

                {config.active_custom_url && (
                    <>


                        <div className="col-lg-6">
                            <div className="mb-3">
                                <label className="form-label fw-medium">Custom Partner Portal URL <span className="text-danger">*</span></label>
                                <div className="input-group">
                                    <span className={`input-group-text bg-light border-end-0 ${errors.partner_domain ? 'border-danger' : ''}`}>
                                        <i className="ri-global-line text-primary"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.partner_domain ? 'is-invalid' : ''}`}
                                        name="partner_domain"
                                        placeholder="e.g. partner.yourcompany.com"
                                        value={config.partner_domain}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                {errors.partner_domain && <div className="invalid-feedback d-block">{errors.partner_domain}</div>}
                                <small className="text-muted mt-1 d-block">
                                    The full domain where your partners will log in.
                                </small>
                            </div>
                        </div>

                        <div className="col-lg-6">
                            <div className="mb-3">
                                {/* Optional, even with the custom domain on (BUG-121). */}
                                <label className="form-label fw-medium">Custom Borrower Portal URL</label>
                                <div className="input-group">
                                    <span className={`input-group-text bg-light border-end-0 ${errors.borrower_domain ? 'border-danger' : ''}`}>
                                        <i className="ri-user-settings-line text-success"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.borrower_domain ? 'is-invalid' : ''}`}
                                        name="borrower_domain"
                                        placeholder="e.g. apply.yourcompany.com"
                                        value={config.borrower_domain}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                {errors.borrower_domain && <div className="invalid-feedback d-block">{errors.borrower_domain}</div>}
                                <small className="text-muted mt-1 d-block">
                                    The full domain where your borrowers will submit applications.
                                </small>
                            </div>
                        </div>

                        <div className="col-lg-12">
                            <div className="alert alert-info border-0 rounded-3 mb-4 shadow-sm" role="alert">
                                <div className="d-flex">
                                    <div className="flex-shrink-0">
                                        <i className="ri-information-line fs-24 text-info"></i>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <h5 className="alert-heading text-info fw-semibold mb-2">Tenant DNS Configuration</h5>
                                        <p className="mb-0 text-muted fs-14">
                                            To set up the white-label portal, ask the partner to point their custom domain's <strong>A Record</strong> to our server IP:
                                            <code className="mx-2 p-1 bg-white border rounded text-dark">{import.meta.env.VITE_BASE_URL_IP}</code>
                                            <br />
                                            Below are the required DNS records based on the domains you enter:
                                        </p>

                                        <div className="mt-3 p-2 bg-white-50 border border-info border-dashed rounded-2 mb-2">
                                            <div className="row g-2 text-center text-sm-start align-items-center">
                                                <div className="col-sm-12 col-md-3">
                                                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-12">Partner Portal</span>
                                                </div>
                                                <div className="col-sm-3 mt-md-0 mt-2">
                                                    <small className="text-muted d-block">Type</small>
                                                    <span className="fw-bold text-info">A Record</span>
                                                </div>
                                                <div className="col-sm-3">
                                                    <small className="text-muted d-block">Name / Host</small>
                                                    <span className="fw-bold font-monospace text-dark">
                                                        {config.partner_domain ? config.partner_domain.split('.')[0] : 'partner'}
                                                    </span>
                                                </div>
                                                <div className="col-sm-3">
                                                    <small className="text-muted d-block">Value / Points to</small>
                                                    <span className="fw-bold font-monospace text-dark">{import.meta.env.VITE_BASE_URL_IP || '...'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-2 bg-white-50 border border-info border-dashed rounded-2">
                                            <div className="row g-2 text-center text-sm-start align-items-center">
                                                <div className="col-sm-12 col-md-3">
                                                    <span className="badge bg-success-subtle text-success border border-success-subtle fs-12">Borrower Portal</span>
                                                </div>
                                                <div className="col-sm-3 mt-md-0 mt-2">
                                                    <small className="text-muted d-block">Type</small>
                                                    <span className="fw-bold text-info">A Record</span>
                                                </div>
                                                <div className="col-sm-3">
                                                    <small className="text-muted d-block">Name / Host</small>
                                                    <span className="fw-bold font-monospace text-dark">
                                                        {config.borrower_domain ? config.borrower_domain.split('.')[0] : 'apply'}
                                                    </span>
                                                </div>
                                                <div className="col-sm-3">
                                                    <small className="text-muted d-block">Value / Points to</small>
                                                    <span className="fw-bold font-monospace text-dark">{import.meta.env.VITE_BASE_URL_IP || '...'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </>
                )}


            </div>
        </form>
    );
}
