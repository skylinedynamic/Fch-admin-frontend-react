/**
 * The Owner Summary screen's options and labels. The keys are fch-api
 * OwnerSummaryPeriod / OwnerSummaryService constants - change them there first.
 */

export const OWNER_SUMMARY_ROUTE = '/owner-summary';

/** Host staff holding this see the host's whole book (fch-api CommissionViewer::MANAGE_PERMISSION). */
export const COMMISSION_MANAGE_PERMISSION = 'update commission';

export const OWNER_SUMMARY_PERIOD = {
    THIS_MONTH: 'this_month',
    LAST_MONTH: 'last_month',
    THIS_QUARTER: 'this_quarter',
    THIS_YEAR: 'this_year',
    LAST_30_DAYS: 'last_30_days',
} as const;

export type OwnerSummaryPeriodKey = typeof OWNER_SUMMARY_PERIOD[keyof typeof OWNER_SUMMARY_PERIOD];

export const OWNER_SUMMARY_PERIOD_OPTIONS: { value: OwnerSummaryPeriodKey; label: string }[] = [
    { value: OWNER_SUMMARY_PERIOD.THIS_MONTH, label: 'This month' },
    { value: OWNER_SUMMARY_PERIOD.LAST_MONTH, label: 'Last month' },
    { value: OWNER_SUMMARY_PERIOD.LAST_30_DAYS, label: 'Last 30 days' },
    { value: OWNER_SUMMARY_PERIOD.THIS_QUARTER, label: 'This quarter' },
    { value: OWNER_SUMMARY_PERIOD.THIS_YEAR, label: 'This year' },
];

export const OWNER_SUMMARY_ENVIRONMENT = {
    PRODUCTION: 'production',
    SANDBOX: 'sandbox',
} as const;

export type OwnerSummaryEnvironment = typeof OWNER_SUMMARY_ENVIRONMENT[keyof typeof OWNER_SUMMARY_ENVIRONMENT];

export const OWNER_SUMMARY_ENVIRONMENT_OPTIONS: { value: OwnerSummaryEnvironment; label: string }[] = [
    { value: OWNER_SUMMARY_ENVIRONMENT.PRODUCTION, label: 'Live' },
    { value: OWNER_SUMMARY_ENVIRONMENT.SANDBOX, label: 'Sandbox' },
];

export const CASH_STREAM = {
    PARTNER_ENROLLMENT: 'partner_enrollment',
    PLATFORM_FEE: 'platform_fee',
    USER_SEAT: 'user_seat',
    BORROWER_FEE: 'borrower_fee',
    CLIENT_ENROLLMENT: 'client_enrollment',
} as const;

export type CashStream = typeof CASH_STREAM[keyof typeof CASH_STREAM];

export const CASH_STREAM_LABELS: Record<CashStream, string> = {
    [CASH_STREAM.PARTNER_ENROLLMENT]: 'Partner enrollment',
    [CASH_STREAM.PLATFORM_FEE]: 'Platform fees',
    [CASH_STREAM.USER_SEAT]: 'User seats',
    [CASH_STREAM.BORROWER_FEE]: 'Borrower fees',
    [CASH_STREAM.CLIENT_ENROLLMENT]: 'Four Corner client enrollment',
};

export const PIPELINE_STAGE = {
    INTAKE: 'intake',
    UNDERWRITING: 'underwriting',
    APPROVED: 'approved',
    WITH_LENDER: 'with_lender',
    CLOSING: 'closing',
    ON_HOLD: 'on_hold',
    FUNDED: 'funded',
} as const;

export type PipelineStage = typeof PIPELINE_STAGE[keyof typeof PIPELINE_STAGE];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
    [PIPELINE_STAGE.INTAKE]: 'Intake',
    [PIPELINE_STAGE.UNDERWRITING]: 'Underwriting',
    [PIPELINE_STAGE.APPROVED]: 'Approved',
    [PIPELINE_STAGE.WITH_LENDER]: 'With lender',
    [PIPELINE_STAGE.CLOSING]: 'Closing',
    [PIPELINE_STAGE.ON_HOLD]: 'On hold',
    [PIPELINE_STAGE.FUNDED]: 'Funded',
};

/** fch-api OwnerSummaryService::LEAD_SOURCE_NOT_SET - a lead saved without a source. */
export const LEAD_SOURCE_NOT_SET = 'not_set';

/** Where each "needs attention" item is dealt with. */
export const OWNER_SUMMARY_LINKS = {
    INVOICES: '/invoices',
    PAYMENTS: '/payments',
    PARTNERS: '/partners',
    COMMISSIONS: '/commissions',
    FUNDING_APPLICATIONS: '/intake-review/funding-application',
    PRE_QUALIFICATIONS: '/intake-review/pre-qualification',
    EMBEDDED_APPLICATIONS: '/embed-form/loan-applications',
    CLIENTS: '/clients',
} as const;

/** fch-api OwnerSummaryService::STALLED_AFTER_DAYS and UNPAID_AGE_DAYS, for the labels. */
export const STALLED_AFTER_DAYS = 14;
export const UNPAID_AGE_DAYS = 30;
export const TRIAL_ENDING_DAYS = 14;
