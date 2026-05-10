import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/auth/authStore';
import { getMyTenantConfig, updateMyTenantConfig } from '../../../modules/partner/services';
import { toast } from 'react-toastify';
import TenantConfigLoader from '../../../components/Loader/TenantConfigLoader';

export default function TenantDomainConfig() {
    const user = useAuthStore((state) => state.user);
    const [config, setConfig] = useState({
        active_custom_url: false,
        partner_domain: '',
        borrower_domain: '',
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const response = await getMyTenantConfig();
            const data = response?.data?.data || response?.data || response;

            if (data && typeof data === 'object') {
                setConfig({
                    active_custom_url: data.active_custom_url === true || data.active_custom_url === 1 || data.active_custom_url === '1',
                    partner_domain: data.partner_domain || '',
                    borrower_domain: data.borrower_domain || '',
                });
            }
        } catch (error) {
            toast.error('Failed to fetch domain configuration');
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

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        setErrors({});

        try {
            const payload = {
                ...config,
                partner_domain: config.partner_domain || null,
                borrower_domain: config.borrower_domain || null,
            };

            await updateMyTenantConfig(payload);
            toast.success('Domain configuration updated successfully');
        } catch (error) {
            if (error.response?.status === 422) {
                setErrors(error.response.data.errors || {});
                const apiErrors = error.response.data.errors || {};
                const firstError = Object.values(apiErrors)[0];
                toast.error(Array.isArray(firstError) ? firstError[0] : 'Validation failed.');
            } else {
                toast.error(error.response?.data?.message || 'Failed to update configuration');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                    <TenantConfigLoader />
                </div>
            </div>
        );
    }

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom d-flex align-items-center gap-3 py-3">
                <div className="avatar-sm flex-shrink-0">
                    <div className="avatar-title bg-primary-subtle text-primary rounded-3 fs-20">
                        <i className="ri-global-line"></i>
                    </div>
                </div>
                <div>
                    <h5 className="card-title mb-0 fs-16 fw-semibold">Custom Domain Configuration</h5>
                    <p className="text-muted mb-0 fs-13">Configure and map your custom domains for white-label portals.</p>
                </div>
            </div>

            <div className="card-body p-4">
                <form id="tenant-domain-config-form" onSubmit={handleSubmit}>
                    <div className="row g-4">
                        {/* Status Toggle */}
                        <div className="col-lg-12">
                            <div className="p-3 bg-light rounded-3">
                                <div className="form-check form-switch form-switch-lg custom-switch-primary d-flex align-items-center">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        id="active_custom_url"
                                        name="active_custom_url"
                                        checked={config.active_custom_url}
                                        onChange={handleToggleChange}
                                    />
                                    <label className="form-check-label fw-bold ms-3 fs-15 text-dark mb-0" htmlFor="active_custom_url">
                                        Enable Custom Domain Logic
                                    </label>
                                </div>
                                <p className="text-muted fs-13 mt-2 mb-0 ms-1">
                                    When enabled, we will resolve your custom domains instead of the default subdomains.
                                </p>
                            </div>
                        </div>

                        {config.active_custom_url && (
                            <>
                                {/* Domain Inputs */}
                                <div className="col-lg-6">
                                    <div className="mb-0">
                                        <label className="form-label fw-semibold fs-13 text-uppercase text-muted mb-2">Partner Portal Domain</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-white border-end-0">
                                                <i className="ri-shield-user-line text-primary fs-16"></i>
                                            </span>
                                            <input
                                                type="text"
                                                className={`form-control border-start-0 ps-0 ${errors.partner_domain ? 'is-invalid' : ''}`}
                                                name="partner_domain"
                                                placeholder="e.g. partner.yourname.com"
                                                value={config.partner_domain}
                                                onChange={handleInputChange}
                                                required={config.active_custom_url}
                                            />
                                        </div>
                                        {errors.partner_domain && <div className="invalid-feedback d-block mt-1">{errors.partner_domain}</div>}
                                        <small className="text-muted mt-2 d-block fs-12">URL for your partner dashboard access.</small>
                                    </div>
                                </div>

                                <div className="col-lg-6">
                                    <div className="mb-0">
                                        <label className="form-label fw-semibold fs-13 text-uppercase text-muted mb-2">Borrower Application Domain</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-white border-end-0">
                                                <i className="ri-user-follow-line text-success fs-16"></i>
                                            </span>
                                            <input
                                                type="text"
                                                className={`form-control border-start-0 ps-0 ${errors.borrower_domain ? 'is-invalid' : ''}`}
                                                name="borrower_domain"
                                                placeholder="e.g. apply.yourname.com"
                                                value={config.borrower_domain}
                                                onChange={handleInputChange}
                                                required={config.active_custom_url}
                                            />
                                        </div>
                                        {errors.borrower_domain && <div className="invalid-feedback d-block mt-1">{errors.borrower_domain}</div>}
                                        <small className="text-muted mt-2 d-block fs-12">URL where borrowers will submit their applications.</small>
                                    </div>
                                </div>

                                {/* DNS Detailed Instructions */}
                                <div className="col-lg-12">
                                    <div className="card bg-info-subtle border-light-subtle shadow-none mb-0">
                                        <div className="card-body p-3">
                                            <div className="d-flex align-items-start gap-3">
                                                <div className="flex-shrink-0">
                                                    <div className="avatar-xs">
                                                        <div className="avatar-title bg-info text-white rounded-circle fs-13">
                                                            <i className="ri-settings-5-line"></i>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1">
                                                    <h6 className="fw-bold mb-2 text-info fs-14">How to Setup DNS Configuration</h6>
                                                    <p className="text-muted fs-13 mb-3">To map your custom domains, follow these steps in your domain registrar's dashboard (e.g., GoDaddy, Namecheap, Cloudflare):</p>

                                                    <div className="vstack gap-4 mt-3">
                                                        <div className="d-flex align-items-start gap-3">
                                                            <div className="avatar-xs flex-shrink-0">
                                                                <span className="avatar-title bg-white text-info border border-info-subtle rounded-circle fs-12 fw-bold">1</span>
                                                            </div>
                                                            <div className="flex-grow-1 mt-1">
                                                                <h6 className="fs-13 mb-1 fw-semibold text-dark">Access DNS Settings</h6>
                                                                <p className="text-muted fs-13 mb-0">Log in to your domain registrar (GoDaddy, Namecheap, etc.) and locate the DNS Management section.</p>
                                                            </div>
                                                        </div>

                                                        <div className="d-flex align-items-start gap-3">
                                                            <div className="avatar-xs flex-shrink-0">
                                                                <span className="avatar-title bg-white text-info border border-info-subtle rounded-circle fs-12 fw-bold">2</span>
                                                            </div>
                                                            <div className="flex-grow-1 mt-1">
                                                                <h6 className="fs-13 mb-1 fw-semibold text-dark">Add A Records</h6>
                                                                <p className="text-muted fs-13 mb-3">Create two new <strong>A Records</strong> using these exact values:</p>

                                                                <div className="border border-info-subtle rounded-3 overflow-hidden shadow-sm">
                                                                    <div className="table-responsive">
                                                                        <table className="table table-sm table-nowrap mb-0 fs-12">
                                                                            <thead className="table-light">
                                                                                <tr className="text-muted">
                                                                                    <th className="ps-3 py-2">Type</th>
                                                                                    <th className="py-2">Host / Name</th>
                                                                                    <th className="pe-3 py-2 text-end">Value / IP</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="bg-white">
                                                                                <tr>
                                                                                    <td className="ps-3 py-2 fw-bold text-dark">A</td>
                                                                                    <td className="py-2 text-primary font-monospace fw-bold">{config.partner_domain ? config.partner_domain.split('.')[0] : 'partner'}</td>
                                                                                    <td className="pe-3 py-2 font-monospace text-dark text-end">{import.meta.env.VITE_BASE_URL_IP}</td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td className="ps-3 py-2 fw-bold text-dark">A</td>
                                                                                    <td className="py-2 text-success font-monospace fw-bold">{config.borrower_domain ? config.borrower_domain.split('.')[0] : 'apply'}</td>
                                                                                    <td className="pe-3 py-2 font-monospace text-dark text-end">{import.meta.env.VITE_BASE_URL_IP}</td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                                <small className="text-muted mt-2 d-block italic fs-11">* Ensure no other A records exist for these specific Host names.</small>
                                                            </div>
                                                        </div>

                                                        <div className="d-flex align-items-start gap-3">
                                                            <div className="avatar-xs flex-shrink-0">
                                                                <span className="avatar-title bg-white text-info border border-info-subtle rounded-circle fs-12 fw-bold">3</span>
                                                            </div>
                                                            <div className="flex-grow-1 mt-1">
                                                                <h6 className="fs-13 mb-1 fw-semibold text-dark text-break">Save & Wait</h6>
                                                                <p className="text-muted fs-13 mb-0">Changes usually take a few minutes, but can take up to 24-48 hours to propagate globally.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Submit Button inside body */}
                        <div className="col-lg-12 pt-2">
                            <button
                                type="submit"
                                className="btn btn-primary d-flex align-items-center gap-2 px-4"
                                disabled={saving}
                                style={{ transition: 'all 0.3s ease' }}
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                        <span>Saving Changes...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="ri-save-3-line fs-18"></i>
                                        <span className="fw-semibold">Update Configuration</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
