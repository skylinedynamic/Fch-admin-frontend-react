/**
 * Partner Status Options Configuration
 */

export interface PartnerStatusOption {
    label: string;
    value: string;
}

export const PARTNER_STATUS: PartnerStatusOption[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
];
