import { SMS_CONFIGURATION_SECTION } from './smsConfiguration';
import { CALENDLY_CONFIGURATION_PERMISSION, CALENDLY_CONFIGURATION_SECTION } from './calendlyConfiguration';

/**
 * Settings sections and the path each one lives at (/settings/<slug>), so a
 * section can be linked to directly - from the mail banner, the configuration
 * guard, a bookmark. The ids are the ones SettingsForm builds its menu from.
 */
export const SETTINGS_BASE_PATH = '/settings';

/** Any one of these opens Settings (the route and the sidebar link); each section then checks its own. */
export const SETTINGS_ACCESS_PERMISSIONS: string[] = [
    'update payment settings',
    'update partner agreement settings',
    'update borrower agreement settings',
    'update email configuration settings',
    'update sms configuration settings',
    'update branding settings',
    'update domain configuration settings',
    'update microbilt settings',
    CALENDLY_CONFIGURATION_PERMISSION,
];

/** Each slug is the menu label, so the path reads like the menu. */
const SECTIONS: Record<string, { slug: string; title: string }> = {
    payment: { slug: 'payment-integration', title: 'Payment Integration' },
    agreement: { slug: 'agreement-builder', title: 'Agreement Builder' },
    email_configuration: { slug: 'email-configuration', title: 'Email Configuration' },
    test_mail: { slug: 'test-mail', title: 'Test Mail' },
    [SMS_CONFIGURATION_SECTION]: { slug: 'sms-configuration', title: 'SMS Configuration' },
    branding: { slug: 'branding', title: 'Branding' },
    domain_configuration: { slug: 'custom-domain', title: 'Custom Domain' },
    microbilt: { slug: 'microbilt-config', title: 'MicroBilt Config' },
    credit_profile: { slug: 'credit-profile', title: 'Credit Profile' },
    score_calculation: { slug: 'score-calculation', title: 'Score Calculation' },
    openai: { slug: 'openai-configuration', title: 'OpenAI Configuration' },
    [CALENDLY_CONFIGURATION_SECTION]: { slug: 'calendly-configuration', title: 'Calendly Configuration' },
};

/** The path a section lives at. */
export const settingsPath = (sectionId: string): string =>
    `${SETTINGS_BASE_PATH}/${SECTIONS[sectionId]?.slug ?? sectionId}`;

/** The section a path's slug names, or null for one it does not know. */
export const sectionFromSlug = (slug: string | undefined): string | null =>
    Object.keys(SECTIONS).find((id) => SECTIONS[id].slug === slug) ?? null;

/** The section's name for the breadcrumb. */
export const settingsSectionTitle = (sectionId: string): string => SECTIONS[sectionId]?.title ?? 'Settings';
