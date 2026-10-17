import React from 'react';
import { EmailConfigSkeleton } from '../../../../components/Loader/SpecificSkeletons';
import {
    useFallbackMailConfiguration,
    useSaveFallbackMailConfiguration,
    useSendFallbackMailCode,
    useVerifyFallbackMailConfiguration,
} from '../../../../modules/settings/queries';
import MailConfigurationCard from './MailConfigurationCard';
import { MailDeliveryStatus, MailUnverifiedAlert, scrollToFirst } from './MailStatusNotices';

/**
 * The one platform-wide fallback, shown only to the host partner's own
 * account. It is a single configuration, whichever provider it uses.
 */
const FallbackMailCard: React.FC = () => {
    const { data, isLoading, isError } = useFallbackMailConfiguration();
    const save = useSaveFallbackMailConfiguration();
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

    const configuration = data.data.configuration;

    // The fallback is trusted only once verified, like any configuration -
    // shown the same way as the partner's own status.
    const notice = configuration?.is_verified ? (
        <MailDeliveryStatus
            label="Fallback delivery status"
            heading={`Fallback sending with ${configuration.provider_label}`}
            configuration={configuration}
        />
    ) : configuration ? (
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
            bannerText="Used for every partner whose own mail configuration is not verified yet, the host included. There is only one, whichever provider it uses."
            notice={notice}
            providers={data.data.providers}
            configurations={configuration ? [configuration] : []}
            save={(payload) => save.mutateAsync(payload)}
            sendCode={() => sendCode.mutateAsync()}
            verify={(_configuration, code) => verify.mutateAsync(code)}
        />
    );
};

export default FallbackMailCard;
