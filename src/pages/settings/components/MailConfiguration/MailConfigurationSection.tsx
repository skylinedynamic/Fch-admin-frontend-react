import React from 'react';
import { EmailConfigSkeleton } from '../../../../components/Loader/SpecificSkeletons';
import {
    useMailConfigurations,
    useMakeDefaultMailConfiguration,
    useSaveMailConfiguration,
    useSendMailConfigurationCode,
    useVerifyMailConfiguration,
} from '../../../../modules/settings/queries';
import FallbackMailCard from './FallbackMailCard';
import MailConfigurationCard from './MailConfigurationCard';
import { MailDeliveryStatus, MailUnverifiedAlert, scrollToFirst } from './MailStatusNotices';

/**
 * Settings > Email Configuration. A partner keeps one configuration per mail
 * provider, verifies each with a code sent through it, and sends with its
 * verified default. Until then its mail goes through the platform fallback,
 * which only the host partner's own account manages.
 */
const MailConfigurationSection: React.FC = () => {
    const { data, isLoading, isError } = useMailConfigurations();
    const save = useSaveMailConfiguration();
    const makeDefault = useMakeDefaultMailConfiguration();
    const sendCode = useSendMailConfigurationCode();
    const verify = useVerifyMailConfiguration();

    if (isError) {
        return <div className="alert alert-danger mb-0">Failed to load the mail configuration.</div>;
    }

    if (isLoading || !data) {
        return (
            <div className="card">
                <div className="card-body p-3 p-sm-4">
                    <EmailConfigSkeleton />
                </div>
            </div>
        );
    }

    const state = data.data;

    const sending = state.uses_own_configuration
        ? state.configurations.find((c) => c.is_default && c.is_verified) ?? null
        : null;

    // Until the partner's own settings are verified its mail is not its own,
    // and may not go out at all - so it is a danger, and the first thing shown.
    const notice = sending ? (
        <MailDeliveryStatus label="Mail delivery status" heading={`Sending with ${sending.provider_label}`} configuration={sending} />
    ) : (
        <MailUnverifiedAlert
            heading="Your mail settings are not verified"
            actionLabel="Verify now"
            onAction={() => scrollToFirst('mail-verify', 'mail-from_address')}
        >
            <p className="mb-0 fs-14">
                Until the mail configuration is verified, all mail will be sent using the fallback mail configuration.
            </p>
            {!state.fallback.is_verified && (
                <p className="mb-0 mt-2 fs-13 fw-semibold">
                    There is no verified fallback mail configuration yet, so mail cannot be sent until one is verified.
                </p>
            )}
        </MailUnverifiedAlert>
    );

    return (
        <>
            <MailConfigurationCard
                idPrefix="mail"
                regionLabel="Email configuration"
                title="Email Configuration"
                subtitle="Configure SMTP or AWS SES email settings"
                bannerTitle="Transactional Email Service"
                bannerText="Configure your system's outbound mail server. Connect via SMTP or AWS SES to ensure reliable delivery of receipts, notifications, and system alerts."
                notice={notice}
                providers={state.providers}
                configurations={state.configurations}
                save={(payload) => save.mutateAsync(payload)}
                sendCode={(configuration) => sendCode.mutateAsync(configuration.id)}
                verify={(configuration, code) => verify.mutateAsync({ id: configuration.id, code })}
                makeDefault={(configuration) => makeDefault.mutateAsync(configuration.id)}
            />

            {state.can_manage_fallback && (
                <div className="mt-4">
                    <FallbackMailCard />
                </div>
            )}
        </>
    );
};

export default MailConfigurationSection;
