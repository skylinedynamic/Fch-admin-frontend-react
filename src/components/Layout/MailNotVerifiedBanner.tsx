import React from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../lib/auth/usePermissions';
import { useMailConfigurations } from '../../modules/settings/queries';
import { settingsPath } from '../../config/settingsSections';

const EMAIL_PERMISSION = 'update email configuration settings';

/**
 * On every page until the partner's own mail configuration is verified: mail
 * goes out through the platform fallback meanwhile, and says from which address.
 * Shown to those who can manage email configuration - the ones who can fix it.
 */
const MailNotVerifiedBanner: React.FC = () => {
    const { hasPermission } = usePermissions();
    const canManage = hasPermission(EMAIL_PERMISSION);
    const { data } = useMailConfigurations(canManage);

    // Shown on every page, so a reply without the expected shape hides the
    // banner rather than throwing and blanking the whole app.
    const mail = data?.data;
    if (!canManage || !mail?.fallback || mail.uses_own_configuration !== false) return null;

    const fromAddress = mail.fallback.from_address;

    return (
        <div className="alert alert-danger mail-not-verified-banner" role="alert">
            <span className="mail-not-verified-banner__icon" aria-hidden="true">
                <i className="ri-mail-close-line"></i>
            </span>
            <p className="mail-not-verified-banner__text mb-0">
                <strong>Mail is not verified yet.</strong>{' '}
                {fromAddress
                    ? <>Until it is verified, all mail will be sent using <span className="mail-not-verified-banner__address">{fromAddress}</span>.</>
                    : <>No mail can be sent until it is verified.</>}
            </p>
            <Link to={settingsPath('email_configuration')} className="btn btn-sm btn-danger d-inline-flex align-items-center gap-1 flex-shrink-0">
                <i className="ri-shield-check-line" aria-hidden="true"></i>
                Verify mail
            </Link>
        </div>
    );
};

export default MailNotVerifiedBanner;
