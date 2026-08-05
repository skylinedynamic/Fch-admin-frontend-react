/**
 * Partner Type Options Configuration
 *
 * Defines the available partner types with their enrollment fees
 */

export const SUBSCRIPTION_PARTNER_TYPES = {
  REFERRAL: "Referral",
  FOUNDING: "Founding Partner",
  EXECUTIVE: "Executive Partner (White-Label)",
};

export const PARTNER_TYPES = {
  CERTIFIED: "Certified Partner",
  WHITE_LABEL: "White-Label Partner (WL)",
};

export const ENROLLMENT_TYPES = {
  ONE_TIME: "One-Time Payment ($5,997)",
  ONE_TIME_STR: "One-Time Payment",
  ONE_TIME_VALUE: 5997,
  PAYMENT_PLAN: "Payment Plan ($797/mo, 11-month plan)",
  PAYMENT_PLAN_STR: "Payment Plan (11-month plan)",
  PAYMENT_PLAN_VALUE: 797,
  SIX_MONTH_STR: "6 Month Payment",
};

export const ENROLLMENT_INSTALLMENTS = {
  ONE_TIME: 1,
  SIX_MONTHS: 6,
  DEFAULT_HOST: 6,
  DEFAULT_NON_HOST: 1,
};

export const CLIENT_TYPE_LABELS = {
  CERTIFIED: "Certified Partner Client",
  WHITE_LABEL: "White-Label Partner Client",
};


export const SUBSCRIPTION_STATUS_TYPES = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  DELINQUENT: "Delinquent",
  CANCELED: "Canceled",
};

export interface PartnerTypeOption {
  label: string;
  value: string;
  oneTimeFee?: number;
  monthlyPayment?: number;
  platformFee?: number;
  planFee?: number; // Legacy support
}

export const PARTNER_TYPE_OPTIONS: PartnerTypeOption[] = [];

export const PARTNER_INFORMATION_TYPE_OPTIONS: PartnerTypeOption[] = [];


export const PAYMENT_TYPE_OPTIONS = [
  { label: ENROLLMENT_TYPES.ONE_TIME, value: ENROLLMENT_TYPES.ONE_TIME_STR },
  {
    label: ENROLLMENT_TYPES.PAYMENT_PLAN,
    value: ENROLLMENT_TYPES.PAYMENT_PLAN_STR,
  },
];

export const SUBSCRIPTION_STATUS_OPTIONS = [
  {
    label: SUBSCRIPTION_STATUS_TYPES.ACTIVE,
    value: SUBSCRIPTION_STATUS_TYPES.ACTIVE,
  },
  {
    label: SUBSCRIPTION_STATUS_TYPES.SUSPENDED,
    value: SUBSCRIPTION_STATUS_TYPES.SUSPENDED,
  },
  {
    label: SUBSCRIPTION_STATUS_TYPES.DELINQUENT,
    value: SUBSCRIPTION_STATUS_TYPES.DELINQUENT,
  },
  {
    label: SUBSCRIPTION_STATUS_TYPES.CANCELED,
    value: SUBSCRIPTION_STATUS_TYPES.CANCELED,
  },
];
