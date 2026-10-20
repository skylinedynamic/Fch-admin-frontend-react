import React, { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Auth from '../../components/Layout/Auth';
import {
    isEmailChangeAction,
    useEmailChangeLink,
    useSubmitEmailChangeLink,
    type EmailChangeLink,
    type EmailChangeLinkParams,
} from '../../modules/account';

const TONE_ICON: Record<EmailChangeLink['tone'], string> = {
    info: 'ri-mail-check-line text-primary',
    success: 'ri-checkbox-circle-line text-success',
    warning: 'ri-error-warning-line text-warning',
    danger: 'ri-close-circle-line text-danger',
};

const NOT_A_LINK = {
    title: 'This link is not valid',
    message: 'Open the link from your email again. If it still does not work, ask for a new email change.',
};

const PASSWORD_REQUIRED = 'Enter your password.';

/**
 * Where the links in the email-change emails land: confirm (sent to the new
 * address), cancel and undo (sent to the old one). The page reads the link
 * from the API and acts on it only when the user says so - mail scanners open
 * links too. Nobody needs to be signed in.
 */
export default function EmailChangeLinkPage() {
    const { action, user, hash } = useParams();
    const { search } = useLocation();
    const link: EmailChangeLinkParams | null =
        isEmailChangeAction(action) && user && hash ? { action, user, hash, query: search } : null;

    const read = useEmailChangeLink(link);
    const submit = useSubmitEmailChangeLink(link);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [missingPassword, setMissingPassword] = useState(false);

    const result = submit.data;
    const wrongPassword = result?.state === 'wrong_password';
    // After acting, the result is what to show - unless the password was wrong,
    // in which case the form stays.
    const shown = result && !wrongPassword ? result : read.data;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!shown) return;
        if (shown.needs_password && password.trim() === '') {
            setMissingPassword(true);
            return;
        }
        setMissingPassword(false);
        submit.mutate(shown.needs_password ? password : undefined);
    };

    if (!link) {
        return <Outcome title={NOT_A_LINK.title} message={NOT_A_LINK.message} tone="warning" loginUrl={null} />;
    }

    if (read.isLoading) {
        return (
            <Auth header={null} belowCard={null}>
                <div className="text-center p-4" role="status">
                    <span className="spinner-border text-primary" aria-hidden="true"></span>
                    <p className="text-muted mt-3 mb-0">Checking your link…</p>
                </div>
            </Auth>
        );
    }

    if (read.isError || submit.isError || !shown) {
        return (
            <Outcome
                title="Something went wrong"
                message="We could not check this link just now. Please try again in a moment."
                tone="warning"
                loginUrl={null}
            />
        );
    }

    if (shown.state !== 'ready') {
        return <Outcome title={shown.title} message={shown.message} tone={shown.tone} loginUrl={shown.login_url} />;
    }

    const fieldError = wrongPassword ? result?.message : missingPassword ? PASSWORD_REQUIRED : '';

    return (
        <Auth header={<Header title={shown.title} tone={shown.tone} />} belowCard={null}>
            <div className="p-2">
                <p className="text-muted text-center mb-4">{shown.message}</p>
                <form noValidate onSubmit={handleSubmit}>
                    {shown.needs_password && (
                        <div className="mb-3">
                            <label className="form-label" htmlFor="email-change-password">Password</label>
                            <div className="position-relative auth-pass-inputgroup">
                                <input
                                    id="email-change-password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className={`form-control pe-5 password-input ${fieldError ? 'is-invalid' : ''}`}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setMissingPassword(false);
                                    }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon material-shadow-none"
                                    onClick={() => setShowPassword((s) => !s)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    <i className={`${showPassword ? 'ri-eye-off-fill' : 'ri-eye-fill'} align-middle`}></i>
                                </button>
                                {fieldError && <div className="invalid-feedback">{fieldError}</div>}
                            </div>
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary w-100" disabled={submit.isPending}>
                        {submit.isPending && <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>}
                        {shown.button}
                    </button>
                </form>
            </div>
        </Auth>
    );
}

function Header({ title, tone }: { title: string; tone: EmailChangeLink['tone'] }) {
    return (
        <div className="text-center mt-2">
            <i className={`${TONE_ICON[tone]} display-5 mb-2 d-block`}></i>
            <h5 className="text-primary mb-0">{title}</h5>
        </div>
    );
}

function Outcome({ title, message, tone, loginUrl }: { title: string; message: string; tone: EmailChangeLink['tone']; loginUrl: string | null }) {
    return (
        <Auth header={<Header title={title} tone={tone} />} belowCard={null}>
            <div className="p-2 text-center">
                <p className="text-muted mb-4">{message}</p>
                <a href={loginUrl || '/login'} className="btn btn-primary w-100">
                    Go to sign in
                </a>
            </div>
        </Auth>
    );
}
