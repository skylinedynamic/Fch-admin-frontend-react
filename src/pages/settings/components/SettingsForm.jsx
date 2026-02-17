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
            {/* Sidebar Skeleton */}
            <div className="col-lg-3">
                <div className="card shadow-sm border-0 overflow-hidden">
                    <div className="card-header bg-light bg-opacity-50 py-3">
                        <div className="placeholder-glow">
                            <span className="placeholder col-8"></span>
                        </div>
                    </div>
                    <div className="list-group list-group-flush p-2">
                        {[1, 2].map(i => (
                            <div key={i} className="list-group-item d-flex align-items-center py-2 border-0 mb-1">
                                <div className="placeholder-glow me-3">
                                    <span className="placeholder rounded-circle" style={{ width: '28px', height: '28px', display: 'block' }}></span>
                                </div>
                                <div className="placeholder-glow flex-grow-1">
                                    <span className="placeholder col-10"></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="col-lg-9">
                <div className="card shadow-sm border-0 h-100 overflow-hidden">
                    <div className="card-header bg-white border-bottom border-light py-3 px-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="placeholder-glow col-4">
                                <span className="placeholder col-12"></span>
                            </div>
                            <div className="placeholder-glow">
                                <span className="placeholder px-4 py-2 rounded-pill"></span>
                            </div>
                        </div>
                    </div>
                    <div className="card-body p-4">
                        <FormLoader count={4} colClass="col-12" />
                    </div>
                </div>
            </div>
        </div>
    );

    if (fetching) return renderSkeleton();

    const renderSidebar = () => {
        const sections = [
            { id: 'payment', label: 'Payment Integration', icon: 'ri-bank-card-2-line', num: 1 },
            // { id: 'system', label: 'System Settings', icon: 'ri-settings-4-line', num: 2 },
            // { id: 'others', label: 'Business Profile', icon: 'ri-community-line', num: 3 }
        ];

        return (
            <div className="card border-0 shadow-sm overflow-hidden">
                <div className="card-header bg-light bg-opacity-50 py-2 border-bottom border-light">
                    <div className="d-flex align-items-center gap-2">
                        <div className="bg-primary bg-opacity-10 p-1 rounded">
                            <i className="ri-list-settings-line text-primary fs-16"></i>
                        </div>
                        <h6 className="card-title mb-0 fs-13 fw-bold text-uppercase tracking-wider">Settings Menu</h6>
                    </div>
                </div>
                <div className="list-group list-group-flush p-2">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            className={`list-group-item list-group-item-action d-flex align-items-center rounded-3 border-0 py-2 mb-1 transition-all ${activeSection === section.id ? 'active shadow-sm' : 'bg-transparent text-muted'}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            <div className={`avatar-xs d-flex align-items-center justify-content-center me-3 rounded-circle transition-all ${activeSection === section.id ? 'bg-white text-primary' : 'bg-light text-secondary'}`} style={{ width: '28px', height: '28px' }}>
                                <i className={`${section.icon} fs-14`}></i>
                            </div>
                            <div className="flex-grow-1">
                                <div className={`fw-semibold ${activeSection === section.id ? 'text-white' : 'text-dark'}`} style={{ fontSize: '13.5px' }}>
                                    {section.label}
                                </div>
                            </div>
                            {activeSection === section.id ? (
                                <i className="ri-checkbox-circle-fill text-white opacity-75 fs-15"></i>
                            ) : (
                                <i className="ri-arrow-right-s-line opacity-50 fs-14"></i>
                            )}
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
                <div className="mb-4 pb-2 border-bottom border-light">
                    <div className="d-flex align-items-center gap-3 mb-2">
                        <div className="bg-primary-subtle p-2 rounded-3 text-primary">
                            <i className="ri-bank-card-2-line fs-20"></i>
                        </div>
                        <div>
                            <h5 className="fw-bold mb-0 fs-16">Stripe Integration</h5>
                            <p className="text-muted fs-13 mb-0">Securely manage your payment gateway credentials</p>
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="form-label d-block fw-bold mb-3 fs-13 text-uppercase text-muted tracking-wide">Environment Configuration</label>
                    <div className="bg-light p-1 rounded-3 d-inline-flex border">
                        <button
                            type="button"
                            className={`btn btn-sm px-4 py-1 rounded-2 fw-semibold transition-all ${isSandbox ? 'btn-primary shadow-sm' : 'btn-link text-muted text-decoration-none'}`}
                            onClick={() => handleInputChange({ target: { name: 'payment_mode', value: 'sandbox' } })}
                        >
                            <i className="ri-flask-line me-2"></i>Sandbox
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm px-4 py-1 rounded-2 fw-semibold transition-all ${!isSandbox ? 'btn-success shadow-sm' : 'btn-link text-muted text-decoration-none'}`}
                            onClick={() => handleInputChange({ target: { name: 'payment_mode', value: 'production' } })}
                        >
                            <i className="ri-rocket-line me-2"></i>Production
                        </button>
                    </div>
                    <div className="mt-3">
                        <div className={`alert ${isSandbox ? 'alert-info' : 'alert-warning'} bg-opacity-10 border-0 fs-13 d-flex align-items-start gap-2 py-2 mb-0`} role="alert">
                            <i className={`${isSandbox ? 'ri-information-line' : 'ri-error-warning-line'} fs-16`}></i>
                            <div>
                                <strong>{isSandbox ? 'Testing Mode' : 'Live Mode'}:</strong> {isSandbox
                                    ? 'Using test keys. Transactions will not be charged.'
                                    : 'Using production keys. Real transactions will be processed.'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row g-4">
                    <div className="col-12">
                        <label className="form-label fw-bold mb-2 fs-13">API Publishable Key <span className="text-danger">*</span></label>
                        <div className="input-with-icon">
                            <div className="input-group shadow-none overflow-hidden border rounded-3 transition-all">
                                <span className={`input-group-text bg-light border-0 px-3 ${errors[`stripe_key${suffix}`] ? 'text-danger' : 'text-muted'}`}>
                                    <i className="ri-key-2-line fs-16"></i>
                                </span>
                                <input
                                    type="text"
                                    className={`form-control border-0 fs-14 bg-transparent ${errors[`stripe_key${suffix}`] ? 'is-invalid' : ''}`}
                                    name={`stripe_key${suffix}`}
                                    value={formData[`stripe_key${suffix}`] || ''}
                                    onChange={handleInputChange}
                                    placeholder={isSandbox ? "pk_test_..." : "pk_live_..."}
                                    style={{ boxShadow: 'none' }}
                                />
                            </div>
                        </div>
                        {errors[`stripe_key${suffix}`] && <small className="text-danger mt-1 fw-medium d-block"><i className="ri-error-warning-line me-1"></i>{errors[`stripe_key${suffix}`]}</small>}
                    </div>
                    <div className="col-12">
                        <label className="form-label fw-bold mb-2 fs-13">API Secret Key <span className="text-danger">*</span></label>
                        <div className="input-with-icon">
                            <div className="input-group shadow-none overflow-hidden border rounded-3 transition-all">
                                <span className={`input-group-text bg-light border-0 px-3 ${errors[`stripe_secret${suffix}`] ? 'text-danger' : 'text-muted'}`}>
                                    <i className="ri-lock-password-line fs-16"></i>
                                </span>
                                <input
                                    type="password"
                                    className={`form-control border-0 fs-14 bg-transparent ${errors[`stripe_secret${suffix}`] ? 'is-invalid' : ''}`}
                                    name={`stripe_secret${suffix}`}
                                    value={formData[`stripe_secret${suffix}`] || ''}
                                    onChange={handleInputChange}
                                    placeholder={isSandbox ? "sk_test_..." : "sk_live_..."}
                                    style={{ boxShadow: 'none' }}
                                />
                            </div>
                        </div>
                        {errors[`stripe_secret${suffix}`] && <small className="text-danger mt-1 fw-medium d-block"><i className="ri-error-warning-line me-1"></i>{errors[`stripe_secret${suffix}`]}</small>}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="row g-4 align-items-stretch">
            <div className="col-lg-3">
                {renderSidebar()}
            </div>

            <div className="col-lg-9">
                <div className="card shadow-sm border-0 h-100 overflow-hidden">

                    <div className="card-body">
                        <form onSubmit={onSubmit}>
                            {activeSection === 'payment' && renderPaymentSettings()}
                            {/* {activeSection === 'system' && renderSystemSettings()} */}
                            {/* {activeSection === 'others' && renderOtherSettings()} */}

                            <div className="d-flex justify-content-end mt-5 pt-4 border-top border-light">
                                <button
                                    type="submit"
                                    className="btn btn-primary w-lg waves-effect waves-light d-flex align-items-center justify-content-center gap-2"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-save-fill fs-18"></i>
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
