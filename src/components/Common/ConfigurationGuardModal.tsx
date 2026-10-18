import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth/authStore';
import { useConfigStore } from '../../store/config';
import { PARTNER_TYPES } from '../../config/partnerTypeOptions';
import { SETTINGS_BASE_PATH, settingsPath } from '../../config/settingsSections';
import '../../../assets/css/profile-incomplete.css';

const ConfigurationGuardModal = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((state) => state.user);

    // Retrieve branding and flags directly from our global Zustand store!
    const { branding, statusFlags, setupPromptOpen, closeSetupPrompt } = useConfigStore();
    const primaryColor = branding?.primary_color;
    const flags = statusFlags;

    // Only the Embedded Form configuration page is guarded, not its submissions
    // list. Email configuration is never required here: until a partner's own
    // mail configuration is verified its mail goes out with the platform's
    // fallback configuration, and MailNotVerifiedBanner says so on every page.
    const guardedRoutes = ['/leads', '/appointments', '/users', '/employees', '/clients', '/embed-form/settings'];
    const isGuardedRoute = guardedRoutes.some(route => location.pathname.startsWith(route));

    const parseTrueFlag = (value: unknown) =>
        value === true || value === 'true' || value === 1 || value === '1';

    // Show modal only after config flags are loaded and a real missing state is detected
    const isBrandingMissing = !parseTrueFlag(flags?.is_fresh_settings);
    const isPaymentMissing = !parseTrueFlag(flags?.is_fresh_payment);
    const configLoaded = flags !== null && flags !== undefined;

    const isHost = user?.is_host == 1;
    const partnerType = (user?.partner_type || '').toString().trim();
    const isWhiteLabel = partnerType === PARTNER_TYPES.WHITE_LABEL && !isHost;
    const isCertified = partnerType === PARTNER_TYPES.CERTIFIED && !isHost;

    // Right after the partner pays, the list shows on whatever page they are on
    // (see InvoiceTable/InvoiceDetails); otherwise only on the guarded pages.
    const showModal = !isHost && (isGuardedRoute || setupPromptOpen) && configLoaded && (
        (isWhiteLabel && (isBrandingMissing || isPaymentMissing)) ||
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

    // Each section opens its own settings page.
    const openSettings = (path: string) => {
        closeSetupPrompt();
        navigate(path);
    };

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
                        {setupPromptOpen && !isGuardedRoute ? (
                            <p className="cgm-right-desc">
                                Your payment is complete. Finish these settings so the system works as it should - choose one to open it.
                            </p>
                        ) : (
                            <p className="cgm-right-desc">
                                To ensure the system functions accurately, complete the following global settings before accessing{' '}
                                <strong>{pageLabel}</strong>.
                            </p>
                        )}

                        {/* Branding — shown only when missing for White-Label */}
                        {isWhiteLabel && isBrandingMissing && (
                            <button type="button" className="cgm-item cgm-item-link" onClick={() => openSettings(settingsPath('branding'))}>
                                <span className="cgm-icon-box cgm-bg-branding">
                                    <i className="ri-palette-line cgm-icon-branding" />
                                </span>
                                <span>
                                    <span className="cgm-item-title">Branding Configuration</span>
                                    <span className="cgm-item-desc">Logos, colors, and site identity are missing.</span>
                                </span>
                                <i className="ri-arrow-right-s-line cgm-item-arrow" aria-hidden="true" />
                            </button>
                        )}

                        {/* Payment Integration — shown only when missing for White-Label or Certified Partner */}
                        {(isWhiteLabel || isCertified) && isPaymentMissing && (
                            <button type="button" className="cgm-item cgm-item-link" onClick={() => openSettings(settingsPath('payment'))}>
                                <span className="cgm-icon-box cgm-bg-payment">
                                    <i className="ri-bank-card-line cgm-icon-payment" />
                                </span>
                                <span>
                                    <span className="cgm-item-title">Payment Integration</span>
                                    <span className="cgm-item-desc">Stripe payment settings are required to process transactions.</span>
                                </span>
                                <i className="ri-arrow-right-s-line cgm-item-arrow" aria-hidden="true" />
                            </button>
                        )}

                        <button onClick={() => openSettings(SETTINGS_BASE_PATH)} className="cgm-btn-main">
                            Go to Global Settings
                        </button>
                        {setupPromptOpen && !isGuardedRoute ? (
                            <button onClick={closeSetupPrompt} className="cgm-btn-ghost">
                                I&apos;ll do it later
                            </button>
                        ) : (
                            <button onClick={() => openSettings('/')} className="cgm-btn-ghost">
                                Back to Dashboard
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </>
    );
};

export default ConfigurationGuardModal;