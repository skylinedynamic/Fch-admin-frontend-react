import { PARTNER_TYPES } from './partnerTypeOptions';
import { SMS_CONFIGURATION_PERMISSION, SMS_CONFIGURATION_SECTION } from './smsConfiguration';

/** Permission the API's mail-configuration routes require (as on Settings › Email Configuration). */
export const EMAIL_CONFIGURATION_PERMISSION = 'update email configuration settings';

/** Permission editing payment providers needs (as on Settings › Payment Integration). */
export const PAYMENT_SETTINGS_PERMISSION = 'update payment settings';

/**
 * Permission the Agreement Builder needs (as on Settings › Agreement Builder,
 * where the host manages its own partner agreement).
 */
export const AGREEMENT_SETTINGS_PERMISSION = 'update partner agreement settings';

/**
 * Partner profile › Configuration: the host views and edits a partner's Email,
 * SMS, Branding, Agreement and Payment settings. The API allows naming another partner
 * only for a host user with this permission (fch-api ConfigPartner).
 */
export const PARTNER_CONFIGURATION_PERMISSION = 'manage partner configuration';

/** The partner profile tab id. */
export const PARTNER_CONFIGURATION_TAB = 'configuration';

export type PartnerConfigurationSectionId = 'email_configuration' | typeof SMS_CONFIGURATION_SECTION | 'branding' | 'agreement' | 'payment';

export type PartnerConfigurationSection = { id: PartnerConfigurationSectionId; label: string; description: string };

const EMAIL: PartnerConfigurationSection = { id: 'email_configuration', label: 'Email Configuration', description: 'Mail providers and the sending address' };
const SMS: PartnerConfigurationSection = { id: SMS_CONFIGURATION_SECTION, label: 'SMS Configuration', description: 'Twilio account for text messages' };
const BRANDING: PartnerConfigurationSection = { id: 'branding', label: 'Branding', description: 'Name, logos and colours' };
const PAYMENT: PartnerConfigurationSection = { id: 'payment', label: 'Payment Integration', description: 'Payment providers offered to clients' };
const AGREEMENT: PartnerConfigurationSection = { id: 'agreement', label: 'Agreement', description: 'The agreement its borrowers sign' };

/**
 * The sections a partner has, as on its own Settings page: a white-label
 * partner runs its own mail, SMS and brand; a certified partner trades under
 * the platform's. Every partner keeps its own borrower agreement and payment
 * settings.
 *
 * Email, SMS, Agreement and Payment are also left out when the signed-in user
 * lacks the area's settings permission (for Email and SMS the API refuses too;
 * Agreement's and Payment's are checked here only - the agreement endpoints
 * check `manage partner configuration`). Branding needs nothing more.
 */
export const partnerConfigurationSections = (
    partner: { partner_type?: string | null },
    hasPermission: (name: string) => boolean,
): PartnerConfigurationSection[] => {
    const ownSettings = [
        ...(hasPermission(AGREEMENT_SETTINGS_PERMISSION) ? [AGREEMENT] : []),
        ...(hasPermission(PAYMENT_SETTINGS_PERMISSION) ? [PAYMENT] : []),
    ];

    if (partner.partner_type !== PARTNER_TYPES.WHITE_LABEL) {
        return ownSettings;
    }

    return [
        ...(hasPermission(EMAIL_CONFIGURATION_PERMISSION) ? [EMAIL] : []),
        ...(hasPermission(SMS_CONFIGURATION_PERMISSION) ? [SMS] : []),
        BRANDING,
        ...ownSettings,
    ];
};

/** Whether the signed-in user gets the Configuration tab on this partner. */
export const canManagePartnerConfiguration = (
    user: { is_host?: number | boolean | null } | null | undefined,
    hasPermission: (name: string) => boolean,
    partnerId: number | string | null | undefined,
): boolean => Boolean(partnerId) && Boolean(user && Number(user.is_host) === 1) && hasPermission(PARTNER_CONFIGURATION_PERMISSION);
