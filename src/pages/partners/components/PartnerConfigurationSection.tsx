import React, { useState } from 'react';
import { ConfigPartnerProvider, type ConfigPartner } from '../../../modules/settings/configPartner';
import { usePermissions } from '../../../lib/auth/usePermissions';
import {
    partnerConfigurationSections,
    type PartnerConfigurationSectionId,
} from '../../../config/partnerConfiguration';
import { PARTNER_TYPES } from '../../../config/partnerTypeOptions';
import { SMS_CONFIGURATION_SECTION } from '../../../config/smsConfiguration';
import MailConfigurationSection from '../../settings/components/MailConfiguration/MailConfigurationSection';
import SmsConfigurationForm from '../../settings/components/SmsConfiguration/SmsConfigurationForm';
import BrandingForm from '../../settings/components/BrandingForm';
import PaymentMethodConfig from '../../settings/components/PaymentMethodConfig/PaymentMethodConfig';
import AgreementBuilder from '../../settings/components/AgreementBuilder';
import '../../../../assets/css/settings-redesign.css';

type Props = {
    partner: ConfigPartner;
};

const initialsOf = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'P';

const typeLabel = (type?: string | null) =>
    type === PARTNER_TYPES.WHITE_LABEL ? 'White-Label' : type === PARTNER_TYPES.CERTIFIED ? 'Certified' : type || null;

const statusLabel = (status?: string | null) =>
    status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : null;

/** A small summary of whose settings these are. */
function PartnerSummary({ partner }: Props): React.JSX.Element {
    const name = partner.company_name || partner.full_name || 'Partner';
    const type = typeLabel(partner.partner_type);
    const status = statusLabel(partner.status);
    const contacts = [
        partner.full_name && partner.full_name !== name ? { label: 'Contact', value: partner.full_name } : null,
        partner.email ? { label: 'Email', value: partner.email } : null,
        partner.phone_number ? { label: 'Phone', value: partner.phone_number } : null,
    ].filter((item): item is { label: string; value: string } => item !== null);

    return (
        <section className="partner-config__summary" aria-label="Partner details">
            <div className="partner-config__avatar" aria-hidden="true">{initialsOf(name)}</div>
            <div className="partner-config__identity">
                <div className="partner-config__name">{name}</div>
                <div className="partner-config__badges">
                    {type && <span className="partner-config__badge">{type}</span>}
                    {status && (
                        <span className={`partner-config__badge ${status === 'Active' ? 'is-active' : 'is-muted'}`}>{status}</span>
                    )}
                </div>
            </div>
            {contacts.length > 0 && (
                <dl className="partner-config__contacts">
                    {contacts.map((item) => (
                        <div key={item.label} className="partner-config__contact">
                            <dt>{item.label}</dt>
                            <dd>{item.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </section>
    );
}

/**
 * Partner profile › Configuration: the partner's own Email, SMS, Branding,
 * Agreement and Payment settings screens, as the partner sees them under Settings, editing
 * that partner's settings rather than the signed-in host's (ConfigPartnerProvider).
 */
export default function PartnerConfigurationSection({ partner }: Props): React.JSX.Element {
    const { hasPermission } = usePermissions();
    const sections = partnerConfigurationSections(partner, hasPermission);
    const [active, setActive] = useState<PartnerConfigurationSectionId | undefined>(sections[0]?.id);
    const current = sections.find((section) => section.id === active) ?? sections[0];
    const partnerName = partner.company_name || partner.full_name || 'this partner';

    return (
        <ConfigPartnerProvider partner={partner}>
            <div className="partner-config">
                <PartnerSummary partner={partner} />

                {partner.partner_type !== PARTNER_TYPES.WHITE_LABEL && (
                    <div className="partner-config__note" role="note">
                        {partnerName} is not a white-label partner, so it uses the platform's email, SMS and branding.
                        Only its agreement and payment settings are its own.
                    </div>
                )}

                {!current ? (
                    <div className="partner-config__note" role="note">
                        Your role cannot change any of {partnerName}'s settings.
                    </div>
                ) : (
                <div className="partner-config__layout">
                    <nav className="partner-config__menu" aria-label="Configuration sections">
                        <div className="partner-config__menu-title">Configuration</div>
                        <div role="tablist" aria-orientation="vertical">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={current.id === section.id}
                                    aria-describedby={`partner-config-${section.id}-description`}
                                    className={`partner-config__menu-item ${current.id === section.id ? 'is-active' : ''}`}
                                    onClick={() => setActive(section.id)}
                                >
                                    <span className="partner-config__menu-label">{section.label}</span>
                                    <span
                                        id={`partner-config-${section.id}-description`}
                                        className="partner-config__menu-description"
                                        aria-hidden="true"
                                    >
                                        {section.description}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </nav>

                    <div className="partner-config__panel" role="tabpanel">
                        <div className="partner-config__panel-header">
                            <h5 className="partner-config__panel-title">{current.label}</h5>
                            <p className="partner-config__panel-subtitle">
                                Changes apply to {partnerName} straight away.
                            </p>
                        </div>
                        <div className="partner-config__panel-body">
                            {current.id === 'email_configuration' ? (
                                <MailConfigurationSection />
                            ) : current.id === SMS_CONFIGURATION_SECTION ? (
                                <SmsConfigurationForm />
                            ) : current.id === 'branding' ? (
                                <BrandingForm />
                            ) : current.id === 'agreement' ? (
                                <AgreementBuilder />
                            ) : (
                                <PaymentMethodConfig />
                            )}
                        </div>
                    </div>
                </div>
                )}
            </div>
        </ConfigPartnerProvider>
    );
}
