import React from 'react';
import { EmailConfigSkeleton } from '../../../../components/Loader/SpecificSkeletons';
import {
    useFallbackMailConfiguration,
    useMakeDefaultFallbackMailConfiguration,
    useSaveFallbackMailConfiguration,
    useSendFallbackMailCode,
    useVerifyFallbackMailConfiguration,
} from '../../../../modules/settings/queries';
import MailConfigurationCard from './MailConfigurationCard';
import { MailDeliveryStatus, MailUnverifiedAlert, scrollToFirst } from './MailStatusNotices';

/**
 * The platform-wide fallback, shown only to the host partner's own account.
 * Like a partner's own, it keeps one configuration per provider and sends with
 * its verified default - so saving SES never throws the SMTP settings away.
 */
const FallbackMailCard: React.FC = () => {
    const { data, isLoading, isError } = useFallbackMailConfiguration();
    const save = useSaveFallbackMailConfiguration();
    const makeDefault = useMakeDefaultFallbackMailConfiguration();
    const sendCode = useSendFallbackMailCode();
    const verify = useVerifyFallbackMailConfiguration();

    if (isError) {
        return <div className="alert alert-danger">Failed to load the fallback mail configuration.</div>;
    }

    if (isLoading || !data) {
        return (
            <div className="card" aria-busy="true">
                <div className="card-body p-3 p-sm-4">
                    <EmailConfigSkeleton />
                </div>
            </div>
        );
    }

    const { configurations, providers, sending_id: sendingId } = data.data;
    // The API says which one mail goes out with: the verified default, else
    // another verified provider.
    const sending = configurations.find((c) => c.id === sendingId) ?? null;

    // The fallback is trusted only once verified, like any configuration -
    // shown the same way as the partner's own status.
    const notice = sending ? (
        <MailDeliveryStatus
            label="Fallback delivery status"
            heading={`Fallback sending with ${sending.provider_label}`}
            configuration={sending}
        />
    ) : configurations.length > 0 ? (
        <MailUnverifiedAlert
            heading="Fallback mail is not verified"
            actionLabel="Verify now"
            onAction={() => scrollToFirst('mail-fallback-verify', 'mail-fallback-from_address')}
        >
            <p className="mb-0 fs-14">
                Partners without their own verified mail configuration get no mail until the fallback is verified.
            </p>
        </MailUnverifiedAlert>
    ) : (
        <MailUnverifiedAlert
            heading="No fallback mail configuration"
            actionLabel="Set up now"
            onAction={() => scrollToFirst('mail-fallback-from_address')}
        >
            <p className="mb-0 fs-14">
                Partners without their own verified mail configuration get no mail until a fallback is set up and verified.
            </p>
        </MailUnverifiedAlert>
    );

    return (
        <MailConfigurationCard
            idPrefix="mail-fallback"
            regionLabel="Fallback email configuration"
            title="Fallback Email Configuration"
            subtitle="The mail server every partner falls back to"
            bannerTitle="Fallback Mail Server"
            bannerText="Used for every partner whose own mail configuration is not verified yet, the host included. Each provider is kept and verified on its own; mail goes out with the verified default."
            notice={notice}
            providers={providers}
            configurations={configurations}
            save={(payload) => save.mutateAsync(payload)}
            sendCode={(configuration) => sendCode.mutateAsync(configuration.id)}
            verify={(configuration, code) => verify.mutateAsync({ id: configuration.id, code })}
            makeDefault={(configuration) => makeDefault.mutateAsync(configuration.id)}
        />
    );
};

export default FallbackMailCard;
