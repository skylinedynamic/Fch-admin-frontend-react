import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { MailConfigurationActionResponse } from '../../../../modules/settings/types';
import { useAuthStore } from '../../../../store/auth/authStore';
import { apiErrorMessage, apiFieldErrors } from '../SmsConfiguration/apiErrors';

/** How long the API makes a new code wait (config/mail_configuration.php). */
const RESEND_SECONDS = 60;
const CODE_LENGTH = 6;

interface MailVerificationPanelProps {
    /** Where "Verify now" scrolls to. */
    id?: string;
    idPrefix: string;
    sendCode: () => Promise<MailConfigurationActionResponse>;
    verify: (code: string) => Promise<unknown>;
}

/**
 * Sends a code through the saved settings to the signed-in user, then takes it
 * back. Getting the code at all is what proves the settings can send.
 *
 * The six boxes are drawn over one real input, so typing, pasting a whole
 * code, deleting and screen readers all work as with any field.
 */
const MailVerificationPanel: React.FC<MailVerificationPanelProps> = ({ id, idPrefix, sendCode, verify }) => {
    const email = useAuthStore((state) => state.user?.email);
    const [codeSent, setCodeSent] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [focused, setFocused] = useState(false);
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const codeInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [cooldown]);

    const handleSend = async () => {
        setError(null);
        setSending(true);
        try {
            const response = await sendCode();
            setCodeSent(true);
            setNotice(response.message);
            setCode('');
            setCooldown(RESEND_SECONDS);
            window.setTimeout(() => codeInput.current?.focus(), 0);
        } catch (e) {
            setError(apiErrorMessage(e, 'The verification code could not be sent. Please try again.'));
        } finally {
            setSending(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setVerifying(true);
        try {
            await verify(code);
            toast.success('Mail configuration verified.');
        } catch (err) {
            setError(apiFieldErrors(err)?.code ?? apiErrorMessage(err, 'The code could not be checked. Please try again.'));
        } finally {
            setVerifying(false);
        }
    };

    return (
        <section id={id} className="mail-verify-card mt-4" aria-label="Verify this configuration">
            <div className="mail-verify-head d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
                <div className="mail-verify-icon flex-shrink-0" aria-hidden="true">
                    <i className="ri-shield-keyhole-line"></i>
                </div>
                <div className="flex-grow-1">
                    <h6 className="mb-1 fw-semibold fs-14 text-dark">Verify this configuration</h6>
                    <p className="text-muted mb-0 fs-13">
                        We&apos;ll email a {CODE_LENGTH}-digit code to {email ? <strong className="text-body">{email}</strong> : 'you'} through
                        these settings. Mail is only sent with verified settings.
                    </p>
                </div>
                {!codeSent && (
                    <button type="button" className="btn btn-primary btn-sm px-3 flex-shrink-0" onClick={handleSend} disabled={sending}>
                        {sending ? (
                            <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                        ) : (
                            <i className="ri-mail-send-line me-1"></i>
                        )}
                        Send verification code
                    </button>
                )}
            </div>

            {codeSent && (
                <div className="mail-verify-body">
                    {notice && (
                        <div className="d-flex align-items-center gap-2 text-success fs-13 mb-3">
                            <i className="ri-mail-check-line fs-16"></i>
                            <span>{notice}</span>
                        </div>
                    )}

                    <form className="d-flex flex-wrap align-items-center gap-3" onSubmit={handleVerify} noValidate>
                        <div className="mail-otp">
                            <label htmlFor={`${idPrefix}-code`} className="visually-hidden">Verification code</label>
                            <input
                                ref={codeInput}
                                id={`${idPrefix}-code`}
                                className="mail-otp-input"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={CODE_LENGTH}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                                onFocus={() => setFocused(true)}
                                onBlur={() => setFocused(false)}
                                disabled={verifying}
                                aria-invalid={error ? true : undefined}
                            />
                            <div className="d-flex gap-2" aria-hidden="true">
                                {Array.from({ length: CODE_LENGTH }, (_, index) => {
                                    const active = focused && index === Math.min(code.length, CODE_LENGTH - 1);
                                    return (
                                        <span
                                            key={index}
                                            className={`mail-otp-box ${code[index] ? 'is-filled' : ''} ${active ? 'is-active' : ''} ${error ? 'is-invalid' : ''}`}
                                        >
                                            {code[index] ?? ''}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary px-4" disabled={verifying || code.length !== CODE_LENGTH}>
                            {verifying && <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>}
                            Verify
                        </button>
                    </form>

                    <div className="fs-12 text-muted mt-3">
                        Didn&apos;t get it? Check your spam folder, or{' '}
                        <button type="button" className="btn btn-link btn-sm p-0 align-baseline fs-12"
                            onClick={handleSend} disabled={sending || cooldown > 0}>
                            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mail-verify-error d-flex align-items-start gap-2 fs-13" role="alert">
                    <i className="ri-error-warning-line"></i>
                    <span>{error}</span>
                </div>
            )}
        </section>
    );
};

export default MailVerificationPanel;
