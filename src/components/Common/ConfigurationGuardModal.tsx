import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth/authStore';

const ConfigurationGuardModal = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((state) => state.user);

    // Guarded routes
    const guardedRoutes = ['/leads', '/appointments', '/users', '/employees', '/clients'];
    
    // Check if current path starts with any of the guarded routes
    const isGuardedRoute = guardedRoutes.some(route => location.pathname.startsWith(route));

    // Show modal if on a guarded route and configurations are missing (null means missing)
    const showModal = isGuardedRoute && (user?.is_email_fresh === null || user?.is_refresh_settings === null);

    if (!showModal) return null;

    const isEmailMissing = user?.is_email_fresh === null;
    const isBrandingMissing = user?.is_refresh_settings === null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                    <div className="row g-0">
                        <div className="col-md-5 d-none d-md-flex align-items-center justify-content-center bg-primary p-4 text-white text-center">
                            <div>
                                <i className="ri-shield-user-fill" style={{ fontSize: '100px' }}></i>
                                <h3 className="mt-3 fw-bold text-white">Action Required</h3>
                                <p className="opacity-75">Please complete your system configuration to unlock these features.</p>
                            </div>
                        </div>
                        <div className="col-md-7 p-5 bg-white">
                            <h2 className="fw-bold mb-4" style={{ color: '#0a1c3d' }}>Configuration Incomplete</h2>
                            
                            <p className="text-muted mb-4">To ensure the system functions accurately for your business, you must set up the following global settings before accessing <strong>{location.pathname.split('/')[1].charAt(0).toUpperCase() + location.pathname.split('/')[1].slice(1)}</strong>.</p>

                            <div className="d-flex flex-column gap-3 mb-5">
                                {isBrandingMissing && (
                                    <div className="p-3 border rounded-3 d-flex align-items-center bg-light">
                                        <div className="rounded-circle bg-warning bg-opacity-10 p-2 me-3">
                                            <i className="ri-palette-line text-warning fs-4"></i>
                                        </div>
                                        <div>
                                            <h6 className="mb-1 fw-bold">Branding Configuration</h6>
                                            <small className="text-muted text-wrap">Logos, colors, and site identity are missing.</small>
                                        </div>
                                    </div>
                                )}
                                
                                {isEmailMissing && (
                                    <div className="p-3 border rounded-3 d-flex align-items-center bg-light">
                                        <div className="rounded-circle bg-danger bg-opacity-10 p-2 me-3">
                                            <i className="ri-mail-send-line text-danger fs-4"></i>
                                        </div>
                                        <div>
                                            <h6 className="mb-1 fw-bold">Email Configuration</h6>
                                            <small className="text-muted text-wrap">SMTP or AWS SES settings required for notifications.</small>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="d-grid gap-2">
                                <button 
                                    onClick={() => navigate('/settings')} 
                                    className="btn btn-primary btn-lg rounded-pill fw-bold shadow-sm py-3"
                                >
                                    Go to Global Settings
                                </button>
                                <button 
                                    onClick={() => navigate('/')} 
                                    className="btn btn-link text-muted mt-2"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfigurationGuardModal;
