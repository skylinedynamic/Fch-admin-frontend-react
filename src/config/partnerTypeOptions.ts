/**
 * Partner Type Options Configuration
 * 
 * Defines the available partner types with their enrollment fees
 */

export interface PartnerTypeOption {
    label: string;
    value: string;
    oneTimeFee?: number;
    planFee?: number;
}

export const PARTNER_TYPE_OPTIONS: PartnerTypeOption[] = [
    {
        label: 'Referral',
        value: 'Referral'
    },
    {
        label: 'Founding Partner',
        value: 'Founding Partner',
        oneTimeFee: 4997,
        planFee: 597
    },
    {
        label: 'Executive Partner (White-Label)',
        value: 'Executive Partner (White-Label)',
        oneTimeFee: 5997,
        planFee: 797
    },
];

export const PAYMENT_TYPE_OPTIONS = [
    { label: 'One-Time Payment', value: 'One-Time Payment' },
    { label: 'Payment Plan (10-month plan)', value: 'Payment Plan (10-month plan)' },
];
