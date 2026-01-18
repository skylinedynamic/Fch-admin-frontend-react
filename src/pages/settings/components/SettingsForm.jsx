import React from 'react';
import { InputText } from 'primereact/inputtext';
import { InputSwitch } from 'primereact/inputswitch';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { RadioButton } from 'primereact/radiobutton';
import { toast } from 'react-toastify';

export default function SettingsForm({
    formData,
    handleInputChange,
    handleConfigChange,
    onSubmit,
    loading,
    errors = {}
}) {
    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.info('Copied to clipboard!', { autoClose: 1500, hideProgressBar: true });
    };

    const mode = formData.payment_mode || 'sandbox'; // Default to sandbox
    const isSandbox = mode === 'sandbox';

    // Helper to get field name based on mode
    const getFieldName = (base) => `${base}_${mode}`;

    return (
        <form onSubmit={onSubmit} className="row justify-content-center">
            <div className="col-xxl-8 col-xl-9 col-lg-10">
                <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ minHeight: '600px' }}>
                    <div className="card-body p-5 bg-white">
                        
                        {/* Form Header */}
                        <div className="d-flex align-items-center justify-content-between mb-5">
                            <div className="d-flex align-items-center gap-4">
                                <div className="avatar-md flex-shrink-0">
                                    <span className="avatar-title bg-light text-primary rounded-circle fs-1">
                                        <i className="ri-wallet-3-line"></i>
                                    </span>
                                </div>
                                <div>
                                    <h3 className="mb-1 text-dark fw-bold">Stripe Settings</h3>
                                    <p className="text-muted mb-0 fs-15">Configure your Stripe API keys and credit card information.</p>
                                </div>
                            </div>
                            
                            {/* Mode Switcher */}
                            <div className="d-flex align-items-center gap-3 bg-light p-2 rounded-pill">
                                <div className="d-flex align-items-center">
                                    <RadioButton 
                                        inputId="mode_sandbox" 
                                        name="payment_mode" 
                                        value="sandbox" 
                                        onChange={handleInputChange} 
                                        checked={isSandbox} 
                                        className="d-none"
                                    />
                                    <label 
                                        htmlFor="mode_sandbox" 
                                        className={`btn btn-sm rounded-pill px-4 fw-medium transition-all ${isSandbox ? 'btn-primary shadow-sm' : 'text-muted'}`}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <i className="ri-flask-line me-2"></i> Sandbox
                                    </label>
                                </div>
                                <div className="d-flex align-items-center">
                                    <RadioButton 
                                        inputId="mode_production" 
                                        name="payment_mode" 
                                        value="production" 
                                        onChange={handleInputChange} 
                                        checked={!isSandbox} 
                                        className="d-none"
                                    />
                                    <label 
                                        htmlFor="mode_production" 
                                        className={`btn btn-sm rounded-pill px-4 fw-medium transition-all ${!isSandbox ? 'btn-success shadow-sm' : 'text-muted'}`}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <i className="ri-rocket-line me-2"></i> Production
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* API Key Configuration */}
                        <div className="mb-5">
                            <h5 className="fw-bold fs-16 mb-2 text-dark">
                                API Key Configuration 
                                <span className={`badge ms-2 ${isSandbox ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'}`}>
                                    {isSandbox ? 'TEST MODE' : 'LIVE MODE'}
                                </span>
                            </h5>
                            <p className="text-muted mb-4 fs-14">Set your Stripe key and secret for <strong>{mode}</strong> environment.</p>

                            <div className="mb-4">
                                <label htmlFor="stripe_key" className="form-label fw-medium text-dark mb-2">Stripe Key</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0 text-muted">
                                        <i className="ri-key-2-line"></i>
                                    </span>
                                    <input
                                        type="text"
                                        id={getFieldName('stripe_key')}
                                        name={getFieldName('stripe_key')}
                                        className={`form-control border-start-0 border-end-0 bg-white ${errors[getFieldName('stripe_key')] ? 'is-invalid' : ''}`}
                                        value={formData[getFieldName('stripe_key')] || ''}
                                        onChange={handleInputChange}
                                        placeholder={isSandbox ? "pk_test_..." : "pk_live_..."}
                                    />
                                    <button
                                        className="btn btn-light border border-start-0 text-muted"
                                        type="button"
                                        onClick={() => copyToClipboard(formData[getFieldName('stripe_key')])}
                                    >
                                        <i className="ri-file-copy-line"></i>
                                    </button>
                                </div>
                                {errors[getFieldName('stripe_key')] && <small className="text-danger mt-1 d-block">{errors[getFieldName('stripe_key')]}</small>}
                            </div>

                            <div className="mb-3">
                                <label htmlFor="stripe_secret" className="form-label fw-medium text-dark mb-2">Stripe Secret</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0 text-muted">
                                        <i className="ri-lock-2-line"></i>
                                    </span>
                                    <input
                                        type="password"
                                        id={getFieldName('stripe_secret')}
                                        name={getFieldName('stripe_secret')}
                                        className={`form-control border-start-0 border-end-0 bg-white ${errors[getFieldName('stripe_secret')] ? 'is-invalid' : ''}`}
                                        value={formData[getFieldName('stripe_secret')] || ''}
                                        onChange={handleInputChange}
                                        placeholder={isSandbox ? "sk_test_..." : "sk_live_..."}
                                    />
                                    <button
                                        className="btn btn-light border border-start-0 text-muted"
                                        type="button"
                                        onClick={() => copyToClipboard(formData[getFieldName('stripe_secret')])}
                                    >
                                        <i className="ri-file-copy-line"></i>
                                    </button>
                                </div>
                                {errors[getFieldName('stripe_secret')] && <small className="text-danger mt-1 d-block">{errors[getFieldName('stripe_secret')]}</small>}
                            </div>
                        </div>

                        {/* Card Information */}
                        <div className="mb-5">
                             <h5 className="fw-bold fs-16 mb-2 text-dark">Card Information</h5>
                             <p className="text-muted mb-4 fs-14">Enter your credit card information for <strong>{mode}</strong> testing.</p>

                            <div className={`p-4 rounded-3 border border-dashed ${isSandbox ? 'bg-light bg-opacity-25' : 'bg-success-subtle bg-opacity-10 border-success border-opacity-25'}`}>
                                <div className="row g-4">
                                     <div className="col-12">
                                         <div className="input-group">
                                            <span className="input-group-text bg-white border-end-0 text-muted">
                                                <i className="ri-user-3-line"></i>
                                            </span>
                                            <input
                                                type="text"
                                                name={getFieldName('card_name')}
                                                className={`form-control border-start-0 bg-white ${errors[getFieldName('card_name')] ? 'is-invalid' : ''}`}
                                                value={formData[getFieldName('card_name')] || ''}
                                                onChange={handleInputChange}
                                                placeholder="Cardholder Name"
                                            />
                                         </div>
                                         {errors[getFieldName('card_name')] && <small className="text-danger mt-1 d-block">{errors[getFieldName('card_name')]}</small>}
                                     </div>
                                    <div className="col-12">
                                         <div className="input-group">
                                            <span className="input-group-text bg-white border-end-0 text-muted">
                                                <i className="ri-bank-card-2-line"></i>
                                            </span>
                                            <input
                                                type="text"
                                                name={getFieldName('card_no')}
                                                className={`form-control border-start-0 border-end-0 bg-white ${errors[getFieldName('card_no')] ? 'is-invalid' : ''}`}
                                                value={formData[getFieldName('card_no')] || ''}
                                                onChange={handleInputChange}
                                                placeholder="0000 0000 0000 0000"
                                            />
                                             <span className="input-group-text bg-white border-start-0">
                                                <i className="ri-visa-line fs-18 text-primary"></i>
                                            </span>
                                         </div>
                                         {errors[getFieldName('card_no')] && <small className="text-danger mt-1 d-block">{errors[getFieldName('card_no')]}</small>}
                                    </div>
                                    
                                    <div className="col-md-8">
                                        <input
                                            type="text"
                                            name={getFieldName('card_expiry')}
                                            className={`form-control bg-white ${errors[getFieldName('card_expiry')] ? 'is-invalid' : ''}`}
                                            value={formData[getFieldName('card_expiry')] || ''}
                                            onChange={handleInputChange}
                                            placeholder="MM / YY"
                                        />
                                        {errors[getFieldName('card_expiry')] && <small className="text-danger mt-1 d-block">{errors[getFieldName('card_expiry')]}</small>}
                                    </div>
                                    <div className="col-md-4">
                                         <div className="input-group">
                                            <input
                                                type="text"
                                                name={getFieldName('card_cvv')}
                                                className={`form-control bg-white border-end-0 ${errors[getFieldName('card_cvv')] ? 'is-invalid' : ''}`}
                                                value={formData[getFieldName('card_cvv')] || ''}
                                                onChange={handleInputChange}
                                                placeholder="CVC"
                                            />
                                             <span className="input-group-text bg-white border-start-0 text-muted">
                                                <i className="ri-question-line" data-bs-toggle="tooltip" title="3 digits on back of card"></i>
                                            </span>
                                        </div>
                                        {errors[getFieldName('card_cvv')] && <small className="text-danger mt-1 d-block">{errors[getFieldName('card_cvv')]}</small>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer / System Config */}
                         <div className="row align-items-center mt-5 pt-3 border-top">
                            <div className="col-md-6">
                                <label className="form-label text-muted mb-1 fs-12 fw-medium text-uppercase ls-1">System Notifications</label>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="form-check form-switch form-switch-lg custom-switch-primary mb-0">
                                        <InputSwitch
                                            inputId="notifications"
                                            checked={formData.configuration?.notifications}
                                            onChange={(e) => handleConfigChange('notifications', e.value)}
                                        />
                                    </div>
                                    <span className="fw-medium text-dark">
                                        {formData.configuration?.notifications ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                            <div className="col-md-6 text-end">
                                <Button
                                    label="Save Settings"
                                    icon="ri-save-line"
                                    className="btn btn-primary btn-lg rounded-pill px-5 waves-effect waves-light"
                                    loading={loading}
                                    type="submit"
                                    style={{ minWidth: '200px' }}
                                />
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
