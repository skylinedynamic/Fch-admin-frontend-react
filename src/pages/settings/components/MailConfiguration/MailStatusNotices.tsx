import React from 'react';
import type { MailConfiguration } from '../../../../modules/settings/types';
import { formatApiDate } from '../../../../utils/dates';

/**
 * Brings the first of these elements that exists into view and focuses its
 * first button - the verification step, or the form when nothing is saved.
 */
export const scrollToFirst = (...ids: string[]): void => {
    const target = ids.map((id) => document.getElementById(id)).find(Boolean);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.querySelector<HTMLButtonElement>('button')?.focus();
};

interface MailDeliveryStatusProps {
    /** The accessible name of the panel. */
    label: string;
    heading: string;
    configuration: MailConfiguration;
}

/** Which verified configuration mail goes out with, and since when. */
export const MailDeliveryStatus: React.FC<MailDeliveryStatusProps> = ({ label, heading, configuration }) => (
    <div className="mail-delivery-status d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-3 mb-4"
        role="status" aria-label={label}>
        <div className="avatar-sm flex-shrink-0">
            <div className="avatar-title bg-success-subtle text-success rounded fs-20">
                <i className="ri-mail-check-line"></i>
            </div>
        </div>
        <div className="flex-grow-1">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                <h6 className="mb-0 fw-semibold fs-14 text-dark">{heading}</h6>
                <span className="mail-delivery-pill">
                    <span className="mail-delivery-dot" aria-hidden="true"></span>
                    Active
                </span>
            </div>
            <p className="text-muted mb-0 fs-13">
                From {configuration.from_address}
                {configuration.verified_at && (
                    <>
                        <span className="mx-2" aria-hidden="true">|</span>
                        Verified {formatApiDate(configuration.verified_at)}
                        {configuration.verified_to && <> · code sent to {configuration.verified_to}</>}
                    </>
                )}
            </p>
        </div>
    </div>
);

interface MailUnverifiedAlertProps {
    heading: string;
    children: React.ReactNode;
    actionLabel: string;
    onAction: () => void;
}

/** Mail that is not going out the way it should: a danger, shown first. */
export const MailUnverifiedAlert: React.FC<MailUnverifiedAlertProps> = ({ heading, children, actionLabel, onAction }) => (
    <div className="alert alert-danger mail-unverified-alert shadow-sm d-flex flex-column flex-sm-row align-items-start gap-3 p-3 p-sm-4 mb-4" role="alert">
        <i className="ri-error-warning-fill flex-shrink-0" style={{ fontSize: '32px', lineHeight: 1 }}></i>
        <div className="flex-grow-1">
            <h6 className="alert-heading fw-bold fs-15 mb-1">{heading}</h6>
            {children}
        </div>
        <button type="button" className="btn btn-danger btn-sm flex-shrink-0 align-self-sm-center" onClick={onAction}>
            {actionLabel}
        </button>
    </div>
);
