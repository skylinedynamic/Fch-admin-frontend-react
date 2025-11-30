/**
 * Partner Type Options Configuration
 * 
 * Defines the available partner types in the system.
 * Used in partner registration, filtering, and profile management.
 */

export interface PartnerTypeOption {
    label: string;
    value: string;
}

export const PARTNER_TYPE_OPTIONS: PartnerTypeOption[] = [
    { label: 'Certified Partner', value: 'Certified Partner' },
    { label: 'White-Label Partner (WL)', value: 'White-Label Partner (WL)' },
];
