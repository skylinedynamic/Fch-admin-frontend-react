import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth/authStore';
import { useConfigStore } from '../../store/config';
import { PARTNER_TYPES } from '../../config/partnerTypeOptions';
import '../../../assets/css/profile-incomplete.css';

const ConfigurationGuardModal = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((state) => state.user);

    // Retrieve branding and flags directly from our global Zustand store!
    const { branding, statusFlags } = useConfigStore();
    const primaryColor = branding?.primary_color;
    const flags = statusFlags;

    const guardedRoutes = ['/leads', '/appointments', '/users', '/employees', '/clients'];
    const isGuardedRoute = guardedRoutes.some(route => location.pathname.startsWith(route));

    // Show modal if configuration is missing based on partner type
    const isEmailMissing = !flags || flags.is_fresh_email === null || flags.is_fresh_email === false;
    const isBrandingMissing = !flags || flags.is_fresh_settings === null || flags.is_fresh_settings === false;
    const isPaymentMissing = !flags || flags.is_fresh_payment === null || flags.is_fresh_payment === false;

    const isWhiteLabel = user?.partner_type === PARTNER_TYPES.WHITE_LABEL;
    const isCertified = user?.partner_type === PARTNER_TYPES.CERTIFIED;

    const showModal = isGuardedRoute && (
        (isWhiteLabel && (isEmailMissing || isBrandingMissing || isPaymentMissing)) ||
        (isCertified && isPaymentMissing)
    );

    console.log('ConfigurationGuardModal debug:', {
        partner_type: user?.partner_type,
        isWhiteLabel,
        isCertified,
        isPaymentMissing,
        isGuardedRoute,
        flags
    });

    if (!showModal) return null;

    const segment = location.pathname.split('/')[1];
    const pageLabel = segment.charAt(0).toUpperCase() + segment.slice(1);

    return (
        <>
            <div className="cgm-overlay" style={{ '--primary-color': primaryColor } as React.CSSProperties}>
                <div className="cgm-modal">

                    {/* Left */}
                    <div className="cgm-left">
                        <div className="cgm-shield">
                            <svg width="58" height="66" viewBox="0 0 58 66" fill="none">
                                <path d="M29 2L4 13v18c0 16.5 10.7 31.9 25 36 14.3-4.1 25-19.5 25-36V13L29 2z"
                                    fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                                <circle cx="29" cy="28" r="10" fill="rgba(255,255,255,0.95)" />
                                <path d="M29 40c-8 0-14 4-14 9v1h28v-1c0-5-6-9-14-9z" fill="rgba(255,255,255,0.95)" />
                            </svg>
                        </div>
                        <div>
                            <p className="cgm-left-title">
                                Action Required
                            </p>
                            <p className="cgm-left-sub">
                                Please complete your system configuration.
                            </p>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="cgm-right">
                        <h2 className="cgm-right-title">
                            Configuration Incomplete
                        </h2>
                        <p className="cgm-right-desc">
                            To ensure the system functions accurately, complete the following global settings before accessing{' '}
                            <strong>{pageLabel}</strong>.
                        </p>

                        {/* Branding — shown only when missing for White-Label */}
                        {isWhiteLabel && isBrandingMissing && (
                            <div className="cgm-item">
                                <div className="cgm-icon-box cgm-bg-branding">
                                    <i className="ri-palette-line cgm-icon-branding" />
                                </div>
                                <div>
                                    <p className="cgm-item-title">Branding Configuration</p>
                                    <p className="cgm-item-desc">Logos, colors, and site identity are missing.</p>
                                </div>
                            </div>
                        )}

                        {/* Email — shown only when missing for White-Label */}
                        {isWhiteLabel && isEmailMissing && (
                            <div className="cgm-item">
                                <div className="cgm-icon-box cgm-bg-email">
                                    <i className="ri-mail-send-line cgm-icon-email" />
                                </div>
                                <div>
                                    <p className="cgm-item-title">Email Configuration</p>
                                    <p className="cgm-item-desc">SMTP or AWS SES settings required for notifications.</p>
                                </div>
                            </div>
                        )}

                        {/* Payment Integration — shown only when missing for White-Label or Certified Partner */}
                        {(isWhiteLabel || isCertified) && isPaymentMissing && (
                            <div className="cgm-item">
                                <div className="cgm-icon-box cgm-bg-payment">
                                    <i className="ri-bank-card-line cgm-icon-payment" />
                                </div>
                                <div>
                                    <p className="cgm-item-title">Payment Integration</p>
                                    <p className="cgm-item-desc">Stripe payment settings are required to process transactions.</p>
                                </div>
                            </div>
                        )}

                        <button onClick={() => navigate('/settings')} className="cgm-btn-main">
                            Go to Global Settings
                        </button>
                        <button onClick={() => navigate('/')} className="cgm-btn-ghost">
                            Back to Dashboard
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
};

export default ConfigurationGuardModal;