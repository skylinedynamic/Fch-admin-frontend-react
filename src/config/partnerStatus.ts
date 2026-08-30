/**
 * Partner Status Options Configuration
 */

export interface PartnerStatusOption {
    label: string;
    value: string;
}

export const PARTNER_STATUS: PartnerStatusOption[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Suspended', value: 'Suspended' },
    { label: 'OnBoarding', value: 'OnBoarding' },
];
