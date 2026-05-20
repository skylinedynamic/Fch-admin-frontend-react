import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth/authStore';
import { useConfigStore } from '../../store/config';

const ConfigurationGuardModal = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((state) => state.user);

    // Retrieve branding and flags directly from our global Zustand store!
    const { branding, statusFlags } = useConfigStore();
    const primaryColor = branding?.primary_color || '#1e3a8a';
    const flags = statusFlags;

    const guardedRoutes = ['/leads', '/appointments', '/users', '/employees', '/clients'];
    const isGuardedRoute = guardedRoutes.some(route => location.pathname.startsWith(route));

    // Show modal if ANY config is missing and user is a White-Label Partner
    const isEmailMissing = flags.is_fresh_email === null;
    const isBrandingMissing = flags.is_fresh_settings === null;
    const isPaymentMissing = flags.is_fresh_payment === null;
    const isWhiteLabel = user?.partner_type === 'White-Label Partner (WL)';
    const showModal = isGuardedRoute && isWhiteLabel && (isEmailMissing || isBrandingMissing || isPaymentMissing);

    if (!showModal) return null;

    const segment = location.pathname.split('/')[1];
    const pageLabel = segment.charAt(0).toUpperCase() + segment.slice(1);

    return (
        <>
            <style>{`
                .cgm-overlay {
                    position: fixed; inset: 0;
                    background: rgb(8 12 28 / 52%);
                    z-index: 1060;
                    display: flex; align-items: center; justify-content: center;
                    padding: 1rem;
                    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
                }
                .cgm-modal {
                    width: 820px; max-width: 100%;
                    display: flex; flex-direction: row;
                    border-radius: 10px; overflow: hidden;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.5);
                }
                .cgm-left {
                    width: 40%; background: ${primaryColor};
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    padding: 3.5rem 2rem; text-align: center;
                }
                .cgm-shield {
                    width: 120px; height: 120px; border-radius: 50%;
                    background: rgba(255,255,255,0.08);
                    border: 1.5px solid rgba(255,255,255,0.15);
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 2rem;
                }
                .cgm-right {
                    flex: 1; background: #ffffff;
                    padding: 3rem 2.5rem;
                    display: flex; flex-direction: column; justify-content: center;
                }
                .cgm-item {
                    display: flex; align-items: center; gap: 14px;
                    padding: 16px 18px; border-radius: 14px;
                    border: 1px solid #e5e7eb; background: #f9fafb;
                    margin-bottom: 12px;
                }
                .cgm-icon-box {
                    width: 46px; height: 46px; border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .cgm-btn-main {
                    width: 100%; padding: 15px; border-radius: 50px;
                    background: ${primaryColor}; color: #fff; border: none;
                    font-size: 15px; font-weight: 700; cursor: pointer;
                    letter-spacing: 0.02em; margin-top: 8px;
                }
                .cgm-btn-ghost {
                    width: 100%; padding: 10px; background: none;
                    border: none; color: #9ca3af; font-size: 14px;
                    cursor: pointer; margin-top: 6px;
                }

                @media (max-width: 640px) {
                    .cgm-overlay { align-items: flex-end; padding: 0; }
                    .cgm-modal { flex-direction: column; border-radius: 20px 20px 0 0; width: 100%; }
                    .cgm-left { width: 100%; flex-direction: row; text-align: left; padding: 1.75rem 1.5rem; gap: 1rem; }
                    .cgm-shield { width: 64px; height: 64px; min-width: 64px; margin: 0; flex-shrink: 0; }
                    .cgm-shield svg { width: 32px; height: 37px; }
                    .cgm-left-title { font-size: 1.1rem !important; margin-bottom: 0.3rem !important; }
                    .cgm-left-sub { font-size: 0.78rem !important; max-width: unset !important; }
                    .cgm-right { padding: 1.75rem 1.25rem; }
                    .cgm-right-title { font-size: 1.35rem !important; margin-bottom: 0.5rem !important; }
                    .cgm-item { padding: 12px 14px; gap: 12px; }
                    .cgm-icon-box { width: 40px; height: 40px; border-radius: 10px; }
                    .cgm-btn-main { padding: 13px; font-size: 14px; }
                }
            `}</style>

            <div className="cgm-overlay">
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
                            <p className="cgm-left-title" style={{ color: '#fff', fontSize: '1.45rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                                Action Required
                            </p>
                            <p className="cgm-left-sub" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', lineHeight: 1.7, maxWidth: 200 }}>
                                Please complete your system configuration.
                            </p>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="cgm-right">
                        <h2 className="cgm-right-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.6rem', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                            Configuration Incomplete
                        </h2>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                            To ensure the system functions accurately, complete the following global settings before accessing{' '}
                            <strong style={{ color: '#0f172a', fontWeight: 700 }}>{pageLabel}</strong>.
                        </p>

                        {/* Branding — shown only when missing */}
                        {isBrandingMissing && (
                            <div className="cgm-item">
                                <div className="cgm-icon-box" style={{ background: '#fef3c7' }}>
                                    <i className="ri-palette-line" style={{ fontSize: 22, color: '#b45309' }} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 3 }}>Branding Configuration</p>
                                    <p style={{ fontSize: 12.5, color: '#9ca3af' }}>Logos, colors, and site identity are missing.</p>
                                </div>
                            </div>
                        )}

                        {/* Email — shown only when missing */}
                        {isEmailMissing && (
                            <div className="cgm-item">
                                <div className="cgm-icon-box" style={{ background: '#fee2e2' }}>
                                    <i className="ri-mail-send-line" style={{ fontSize: 22, color: '#dc2626' }} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 3 }}>Email Configuration</p>
                                    <p style={{ fontSize: 12.5, color: '#9ca3af' }}>SMTP or AWS SES settings required for notifications.</p>
                                </div>
                            </div>
                        )}

                        {/* Payment Integration — shown only when missing */}
                        {isPaymentMissing && (
                            <div className="cgm-item">
                                <div className="cgm-icon-box" style={{ background: '#ede9fe' }}>
                                    <i className="ri-bank-card-line" style={{ fontSize: 22, color: '#7c3aed' }} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 3 }}>Payment Integration</p>
                                    <p style={{ fontSize: 12.5, color: '#9ca3af' }}>Stripe payment settings are required to process transactions.</p>
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