import React from 'react';
import FormLoader from '../../../components/Loader/FormLoader';

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
    const renderSkeleton = () => (
        <div className="row g-4 align-items-stretch animate__animated animate__fadeIn">
            {/* Sidebar Skeleton (Keep for layout stability) */}
            <div className="col-lg-4 col-md-5">
                <div className="bg-white p-4 rounded-4 shadow-sm border-0 h-100">
                    <div className="app-progress-card mb-4">
                        <div className="placeholder-glow">
                            <span className="placeholder col-6 mb-2"></span>
                            <span className="placeholder col-12 mb-3"></span>
                        </div>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: '0%' }}></div>
                        </div>
                    </div>
                    <div className="d-flex flex-column gap-2 mt-4">
                        {[1].map(i => (
                            <div key={i} className="placeholder-glow p-3 rounded-3 bg-light">
                                <span className="placeholder col-10"></span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Skeleton - Using FormLoader to follow "others" */}
            <div className="col-lg-8 col-md-7">
                <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border-0 h-100">
                    <FormLoader count={6} colClass="col-12" />
                </div>
            </div>
        </div>
    );

    if (fetching) return renderSkeleton();

    const renderSidebar = () => {
        const sections = [
            { id: 'payment', label: 'Payment Information', icon: 'ri-bank-card-line', num: 1 },
            // { id: 'system', label: 'System Settings', icon: 'ri-settings-line', num: 2 },
            // { id: 'others', label: 'Business Information', icon: 'ri-building-line', num: 3 }
        ];

        // Progress is 100% since only Payment info is currently active and handled in Step 1
        const progress = 100;

        return (
            <div className="bg-white p-4 rounded-4 shadow-sm border-0 h-100">
                <div className="app-progress-card mb-4">
                    <div className="progress-header d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0 fw-bold">Setup Progress</h6>
                        <span className="progress-badge">{progress}%</span>
                    </div>
                    <p className="text-muted mb-3 small">Step 1 of 1</p>
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <div className="d-flex flex-column gap-2">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            type="button"
                            className={`nav-item-btn d-flex align-items-center gap-3 p-3 rounded-3 border-0 text-start ${activeSection === section.id ? 'active bg-primary text-white shadow' : 'bg-transparent text-dark'}`}
                            onClick={() => setActiveSection(section.id)}
                            style={{ width: '100%' }}
                        >
                            <div className={`nav-item-number d-flex align-items-center justify-content-center rounded-circle ${activeSection === section.id ? 'bg-white text-primary' : 'bg-light text-muted'}`} style={{ width: '32px', height: '32px', minWidth: '32px', fontWeight: 'bold' }}>
                                {section.num}
                            </div>
                            <div className="nav-item-label fw-semibold flex-grow-1">{section.label}</div>
                            <i className={`ri-arrow-right-s-line ${activeSection === section.id ? 'text-white' : 'text-muted opacity-50'}`}></i>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderPaymentSettings = () => {
        const mode = formData.payment_mode || 'sandbox';
        const isSandbox = mode === 'sandbox';
        const suffix = `_${mode}`;

        return (
            <div className="animate__animated animate__fadeIn">
                <div className="mb-4">
                    <h4 className="fw-bold mb-1">Step 1 of 1: Payment Information</h4>
                    <p className="text-muted small">Configure your Stripe integration for payments.</p>
                </div>

                <div className="mb-4">
                    <label className="form-label d-block fw-bold mb-3">Environment Mode</label>
                    <div className="d-flex gap-4">
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="payment_mode"
                                id="mode_sandbox"
                                value="sandbox"
                                checked={isSandbox}
                                onChange={handleInputChange}
                            />
                            <label className="form-check-label fw-semibold" htmlFor="mode_sandbox">
                                <i className="ri-flask-line me-1 text-primary"></i> Sandbox
                            </label>
                        </div>
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="payment_mode"
                                id="mode_production"
                                value="production"
                                checked={!isSandbox}
                                onChange={handleInputChange}
                            />
                            <label className="form-check-label fw-semibold" htmlFor="mode_production">
                                <i className="ri-rocket-line me-1 text-success"></i> Production
                            </label>
                        </div>
                    </div>
                </div>

                <div className="row g-4">
                    <div className="col-12">
                        <label className="form-label fw-semibold mb-2">Stripe Key <span className="text-danger">*</span></label>
                        <div className="input-group shadow-sm rounded-3 overflow-hidden">
                            <span className={`input-group-text bg-light border-end-0 ${errors[`stripe_key${suffix}`] ? 'is-invalid border-danger' : ''}`}>
                                <i className="ri-key-2-line"></i>
                            </span>
                            <input
                                type="text"
                                className={`form-control border-start-0 py-3 ${errors[`stripe_key${suffix}`] ? 'is-invalid' : ''}`}
                                name={`stripe_key${suffix}`}
                                value={formData[`stripe_key${suffix}`] || ''}
                                onChange={handleInputChange}
                                placeholder={isSandbox ? "pk_test_..." : "pk_live_..."}
                            />
                        </div>
                        {errors[`stripe_key${suffix}`] && <small className="text-danger mt-1 d-block">{errors[`stripe_key${suffix}`]}</small>}
                    </div>
                    <div className="col-12">
                        <label className="form-label fw-semibold mb-2">Stripe Secret <span className="text-danger">*</span></label>
                        <div className="input-group shadow-sm rounded-3 overflow-hidden">
                            <span className={`input-group-text bg-light border-end-0 ${errors[`stripe_secret${suffix}`] ? 'is-invalid border-danger' : ''}`}>
                                <i className="ri-lock-2-line"></i>
                            </span>
                            <input
                                type="password"
                                className={`form-control border-start-0 py-3 ${errors[`stripe_secret${suffix}`] ? 'is-invalid' : ''}`}
                                name={`stripe_secret${suffix}`}
                                value={formData[`stripe_secret${suffix}`] || ''}
                                onChange={handleInputChange}
                                placeholder={isSandbox ? "sk_test_..." : "sk_live_..."}
                            />
                        </div>
                        {errors[`stripe_secret${suffix}`] && <small className="text-danger mt-1 d-block">{errors[`stripe_secret${suffix}`]}</small>}
                    </div>
                </div>
            </div>
        );
    };

    /* Non-payment settings commented as requested */
    /*
    const renderSystemSettings = () => (
        <div className="animate__animated animate__fadeIn">
            ...
        </div>
    );

    const renderOtherSettings = () => (
        <div className="animate__animated animate__fadeIn">
            ...
        </div>
    );
    */

    return (
        <div className="row g-4 align-items-stretch">
            <div className="col-lg-4 col-md-5">
                {renderSidebar()}
            </div>

            <div className="col-lg-8 col-md-7">
                <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border-0 h-100">
                    <form onSubmit={onSubmit}>
                        {activeSection === 'payment' && renderPaymentSettings()}
                        {/* {activeSection === 'system' && renderSystemSettings()} */}
                        {/* {activeSection === 'others' && renderOtherSettings()} */}

                        <div className="footer-actions d-flex justify-content-end mt-5 pt-4">
                            <button
                                type="submit"
                                className="btn btn-primary px-5 py-3 rounded-3 fw-bold shadow waves-effect waves-light"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="ri-save-3-line align-middle me-2"></i> Save Settings
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
