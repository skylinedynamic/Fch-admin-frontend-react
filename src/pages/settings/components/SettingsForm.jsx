import React, { useEffect } from 'react';
import FormLoader from '../../../components/Loader/FormLoader';
import AgreementBuilder from './AgreementBuilder';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { useAuthStore } from '../../../store/auth/authStore';
import TestMailForm from './TestMailForm';

export default function SettingsForm({
    formData,
    handleInputChange,
    onSubmit,
    loading,
    fetching,
    errors = {},
    activeSection,
    setActiveSection
}) {

    if (fetching) return (
        <div className="row g-4 animate__animated animate__fadeIn">
            <div className="col-lg-3">
                <div className="card">
                    <div className="card-header placeholder-glow">
                        <span className="placeholder col-7"></span>
                    </div>
                    <div className="list-group list-group-flush p-2">
                        {[1, 2].map(i => (
                            <div key={i} className="list-group-item border-0 py-2 mb-1">
                                <div className="d-flex align-items-center gap-2 placeholder-glow">
                                    <span className="placeholder rounded" style={{ width: 28, height: 28 }}></span>
                                    <span className="placeholder col-8"></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="col-lg-9">
                <div className="card">
                    <div className="card-header placeholder-glow">
                        <span className="placeholder col-4"></span>
                    </div>
                    <div className="card-body p-4">
                        <FormLoader count={4} colClass="col-12" />
                    </div>
                </div>
            </div>
        </div>
    );

    const { hasPermission } = usePermissions();

    const sections = [];
    if (hasPermission('update payment settings')) {
        sections.push({ id: 'payment', label: 'Payment Integration', icon: 'ri-bank-card-2-line' });
    }

    // We only show Agreement Builder if they have partner OR borrower permissions
    const canSeePartnerAgreement = hasPermission('update partner agreement settings');
    const canSeeBorrowerAgreement = hasPermission('update borrower agreement settings');
    if (canSeePartnerAgreement || canSeeBorrowerAgreement) {
        sections.push({ id: 'agreement', label: 'Agreement Builder', icon: 'ri-file-text-line' });
    }

    const user = useAuthStore((state) => state.user);
    if (user && (user.is_host == 1 || user.is_host == true)) {
        sections.push({ id: 'test_mail', label: 'Test Mail', icon: 'ri-mail-send-line' });
    }

    // Auto-select first available section if the active one isn't available
    useEffect(() => {
        if (!fetching && sections.length > 0) {
            const currentSectionAvailable = sections.find(s => s.id === activeSection);
            if (!currentSectionAvailable) {
                setActiveSection(sections[0].id);
            }
        }
    }, [fetching, activeSection, sections.length]);

    const renderPaymentSettings = () => {
        const mode = formData.payment_mode || 'sandbox';
        const isSandbox = mode === 'sandbox';
        const suffix = `_${mode}`;

        return (
            <div className="animate__animated animate__fadeIn">
                {/* Environment Toggle */}
                <div className="mb-4">
                    <label className="form-label fw-semibold fs-13 text-muted text-uppercase mb-2" style={{ letterSpacing: '0.05em' }}>
                        Environment
                    </label>
                    <div className="d-flex gap-2">
                        <button
                            type="button"
                            className={`btn btn-sm px-4 ${isSandbox ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => handleInputChange({ target: { name: 'payment_mode', value: 'sandbox' } })}
                        >
                            <i className="ri-flask-line me-1"></i> Sandbox
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm px-4 ${!isSandbox ? 'btn-success' : 'btn-outline-secondary'}`}
                            onClick={() => handleInputChange({ target: { name: 'payment_mode', value: 'production' } })}
                        >
                            <i className="ri-rocket-line me-1"></i> Production
                        </button>
                    </div>
                    <div className={`alert ${isSandbox ? 'alert-info' : 'alert-warning'} d-flex align-items-center gap-2 py-2 mt-3 mb-0 fs-13`}>
                        <i className={`${isSandbox ? 'ri-information-line' : 'ri-error-warning-line'} fs-16 flex-shrink-0`}></i>
                        <span>
                            <strong>{isSandbox ? 'Testing Mode:' : 'Live Mode:'}</strong>{' '}
                            {isSandbox ? 'Using test keys. Transactions will not be charged.' : 'Using live keys. Real transactions will be processed.'}
                        </span>
                    </div>
                </div>

                <div className="row g-3">
                    {/* API Key */}
                    <div className="col-12">
                        <label className="form-label fw-semibold fs-13">
                            API Publishable Key <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                            <span className={`input-group-text bg-light border-end-0 ${errors[`stripe_key${suffix}`] ? 'border-danger' : ''}`}>
                                <i className="ri-key-2-line text-muted fs-15"></i>
                            </span>
                            <input
                                type="text"
                                className={`form-control border-start-0 fs-14 ${errors[`stripe_key${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                name={`stripe_key${suffix}`}
                                value={formData[`stripe_key${suffix}`] || ''}
                                onChange={handleInputChange}
                                placeholder={isSandbox ? 'pk_test_...' : 'pk_live_...'}
                                style={{ boxShadow: 'none' }}
                            />
                            {errors[`stripe_key${suffix}`] && (
                                <div className="invalid-feedback">
                                    <i className="ri-error-warning-line me-1"></i>{errors[`stripe_key${suffix}`]}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Secret Key */}
                    <div className="col-12">
                        <label className="form-label fw-semibold fs-13">
                            API Secret Key <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                            <span className={`input-group-text bg-light border-end-0 ${errors[`stripe_secret${suffix}`] ? 'border-danger' : ''}`}>
                                <i className="ri-lock-password-line text-muted fs-15"></i>
                            </span>
                            <input
                                type="password"
                                className={`form-control border-start-0 fs-14 ${errors[`stripe_secret${suffix}`] ? 'is-invalid border-danger' : ''}`}
                                name={`stripe_secret${suffix}`}
                                value={formData[`stripe_secret${suffix}`] || ''}
                                onChange={handleInputChange}
                                placeholder={isSandbox ? 'sk_test_...' : 'sk_live_...'}
                                style={{ boxShadow: 'none' }}
                            />
                            {errors[`stripe_secret${suffix}`] && (
                                <div className="invalid-feedback">
                                    <i className="ri-error-warning-line me-1"></i>{errors[`stripe_secret${suffix}`]}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="row g-4 align-items-start">
            {/* Sidebar */}
            <div className="col-lg-3">
                <div className="card">
                    <div className="card-header">
                        <h5 className="card-title mb-0 fs-14">
                            <i className="ri-list-settings-line me-2 align-middle text-muted"></i>
                            Settings Menu
                        </h5>
                    </div>
                    <div className="list-group list-group-flush p-2">
                        {sections.map(section => (
                            <button
                                key={section.id}
                                type="button"
                                className={`list-group-item list-group-item-action d-flex align-items-center gap-2 rounded-2 border-0 py-2 px-3 mb-1 fs-14 ${activeSection === section.id ? 'active' : 'text-body'}`}
                                onClick={() => setActiveSection(section.id)}
                            >
                                <i className={`${section.icon} fs-15 ${activeSection === section.id ? '' : 'text-muted'}`}></i>
                                <span className="fw-medium">{section.label}</span>
                                {activeSection === section.id
                                    ? <i className="ri-checkbox-circle-fill ms-auto opacity-75 fs-14"></i>
                                    : <i className="ri-arrow-right-s-line ms-auto text-muted fs-14"></i>
                                }
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="col-lg-9">
                {activeSection === 'agreement' ? (
                    <div className="card p-0 overflow-hidden">
                        <AgreementBuilder />
                    </div>
                ) : activeSection === 'test_mail' ? (
                    <TestMailForm />
                ) : (
                    <form onSubmit={onSubmit}>
                        <div className="card">
                            {activeSection === 'payment' && (
                                <div className="card-header d-flex align-items-center gap-3">
                                    <div className="avatar-sm flex-shrink-0">
                                        <div className="avatar-title bg-success-subtle text-success rounded fs-20">
                                            <i className="ri-bank-card-2-line"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="card-title mb-0 fs-15">Payment Integration</h5>
                                        <p className="text-muted mb-0 fs-13">Securely manage your Stripe payment gateway credentials</p>
                                    </div>
                                </div>
                            )}

                            <div className="card-body p-4">
                                {activeSection === 'payment' && renderPaymentSettings()}
                            </div>
                            <div className="card-footer d-flex justify-content-end bg-light border-top">
                                <button
                                    type="submit"
                                    className="btn btn-primary waves-effect waves-light d-flex align-items-center gap-2"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-save-line fs-16"></i>
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
