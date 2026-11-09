import { useEffect } from 'react';
import { useActivityEmailSender, ACTIVITY_EMAIL_SENDER_HOST, ACTIVITY_EMAIL_SENDER_PARTNER } from '../../../../modules/activity-log';
import type { ActivityEmailSenderKey } from '../../../../modules/activity-log';
import { EMAIL_COMPOSE_TEXT } from '../../../../config/emailComposeConfig';

interface EmailFromSectionProps {
    /** The modal has opened (the sender is read only then). */
    enabled: boolean;
    /** The partner the record belongs to; none or the host: a host record. */
    partnerId: number | string | null;
    sendFrom: ActivityEmailSenderKey | null;
    onSendFromChange: (sendFrom: ActivityEmailSenderKey) => void;
}

/**
 * Top of New Email, for the host only: who the email goes out from. By default
 * the client's partner's mail settings; the switch sends it from the host's
 * own. One without settings of its own shows the fallback address it is sent
 * from (GET common/activity-logs/email-sender).
 */
export default function EmailFromSection({ enabled, partnerId, sendFrom, onSendFromChange }: EmailFromSectionProps) {
    const { data, isLoading } = useActivityEmailSender(partnerId, enabled);

    // A fresh open starts from the API's default (the partner, if there is one).
    useEffect(() => {
        if (data && sendFrom === null) onSendFromChange(data.default);
    }, [data, sendFrom, onSendFromChange]);

    const partner = data?.options.partner ?? null;
    const chosen = sendFrom === ACTIVITY_EMAIL_SENDER_HOST || !partner ? data?.options.host : partner;

    const isFallback = Boolean(chosen?.address && chosen.uses_fallback);

    return (
        <section className="acm-from" data-testid="email-from" aria-label={EMAIL_COMPOSE_TEXT.fromLabel}>
            <div className="acm-from__body">
                <span className="acm-from__icon" aria-hidden="true"><i className="ri-mail-send-line"></i></span>

                <div className="acm-from__text">
                    <span className="acm-from__label">{EMAIL_COMPOSE_TEXT.fromLabel}</span>
                    {isLoading || !chosen ? (
                        <span className="acm-from__muted">{EMAIL_COMPOSE_TEXT.loadingSender}</span>
                    ) : chosen.address ? (
                        <>
                            <span className="acm-from__name">{chosen.name}</span>
                            <span className="acm-from__address">{chosen.address}</span>
                        </>
                    ) : (
                        <span className="acm-from__error">{EMAIL_COMPOSE_TEXT.noSender}</span>
                    )}
                </div>

                {/* The same switch as New Event's "Set Reminder": its label, then the control. */}
                {partner && (
                    <div className="acm-from__switch">
                        <label className="acm-from__switch-label" htmlFor="emailSendFromHost">{EMAIL_COMPOSE_TEXT.useHostSwitch}</label>
                        <div className="form-check form-switch acm-option__switch">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id="emailSendFromHost"
                                checked={sendFrom === ACTIVITY_EMAIL_SENDER_HOST}
                                onChange={(e) => onSendFromChange(e.target.checked ? ACTIVITY_EMAIL_SENDER_HOST : ACTIVITY_EMAIL_SENDER_PARTNER)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {isFallback && (
                <div className="acm-from__note">
                    <i className="ri-information-line" aria-hidden="true"></i>
                    <span>{EMAIL_COMPOSE_TEXT.fallbackNote}</span>
                </div>
            )}
        </section>
    );
}
