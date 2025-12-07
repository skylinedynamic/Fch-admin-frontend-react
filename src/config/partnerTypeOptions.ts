/**
 * Partner Type Options Configuration
 * 
 * Defines the available partner types with their enrollment fees
 */

export const SUBSCRIPTION_PARTNER_TYPES = {
    REFERRAL: 'Referral',
    FOUNDING: 'Founding Partner',
    EXECUTIVE: 'Executive Partner (White-Label)',
};

export const PARTNER_TYPES = {
    CERTIFIED: 'Certified Partner',
    WHITE_LABEL: 'White-Label Partner (WL)'
};

export const ENROLLMENT_TYPES = {
    ONE_TIME: 'One-Time Payment',
    PAYMENT_PLAN: 'Payment Plan (10-month plan)'
};

export const SUBSCRIPTION_STATUS_TYPES = {
    ACTIVE: 'Active',
    SUSPENDED: 'Suspended',
    DELINQUENT: 'Delinquent',
    CANCELED: 'Canceled'
};

export interface PartnerTypeOption {
    label: string;
    value: string;
    oneTimeFee?: number;
    planFee?: number;
}

export const PARTNER_TYPE_OPTIONS: PartnerTypeOption[] = [
    {
        label: SUBSCRIPTION_PARTNER_TYPES.REFERRAL,
        value: SUBSCRIPTION_PARTNER_TYPES.REFERRAL
    },
    {
        label: SUBSCRIPTION_PARTNER_TYPES.FOUNDING,
        value: SUBSCRIPTION_PARTNER_TYPES.FOUNDING,
        oneTimeFee: 4997,
        planFee: 597
    },
    {
        label: SUBSCRIPTION_PARTNER_TYPES.EXECUTIVE,
        value: SUBSCRIPTION_PARTNER_TYPES.EXECUTIVE,
        oneTimeFee: 5997,
        planFee: 797
    }
];

export const PARTNER_INFORMATION_TYPE_OPTIONS: PartnerTypeOption[] = [
    {
        label: PARTNER_TYPES.CERTIFIED,
        value: PARTNER_TYPES.CERTIFIED
    },
    {
        label: PARTNER_TYPES.WHITE_LABEL,
        value: PARTNER_TYPES.WHITE_LABEL
    }
];

export const PAYMENT_TYPE_OPTIONS = [
    { label: ENROLLMENT_TYPES.ONE_TIME, value: ENROLLMENT_TYPES.ONE_TIME },
    { label: ENROLLMENT_TYPES.PAYMENT_PLAN, value: ENROLLMENT_TYPES.PAYMENT_PLAN },
];

export const SUBSCRIPTION_STATUS_OPTIONS = [
    { label: SUBSCRIPTION_STATUS_TYPES.ACTIVE, value: SUBSCRIPTION_STATUS_TYPES.ACTIVE },
    { label: SUBSCRIPTION_STATUS_TYPES.SUSPENDED, value: SUBSCRIPTION_STATUS_TYPES.SUSPENDED },
    { label: SUBSCRIPTION_STATUS_TYPES.DELINQUENT, value: SUBSCRIPTION_STATUS_TYPES.DELINQUENT },
    { label: SUBSCRIPTION_STATUS_TYPES.CANCELED, value: SUBSCRIPTION_STATUS_TYPES.CANCELED },
];
