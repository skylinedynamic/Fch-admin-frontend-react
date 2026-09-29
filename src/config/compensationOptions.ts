export interface CompensationOption {
    label: string;
    value: string;
}

export const PAID_BY_NONE = 'None';
export const PAID_BY_HOURLY = 'Hourly';
export const PAID_BY_SALARY = 'Salary';
export const PAID_BY_PER_DEAL = 'Per Deal';

export const PAID_BY_OPTIONS: CompensationOption[] = [
    { label: PAID_BY_NONE, value: PAID_BY_NONE },
    { label: PAID_BY_HOURLY, value: PAID_BY_HOURLY },
    { label: PAID_BY_SALARY, value: PAID_BY_SALARY },
    { label: PAID_BY_PER_DEAL, value: PAID_BY_PER_DEAL },
];

export const APPLICABLE_SERVICE_ALL = 'All';
export const APPLICABLE_SERVICE_FUNDING = 'Funding';
export const APPLICABLE_SERVICE_CREDIT_CARD_STACKING = 'Credit Card Stacking';
export const APPLICABLE_SERVICE_BUSINESS_CREDIT_BUILDER = 'Business Credit Builder';

export const APPLICABLE_SERVICE_OPTIONS: CompensationOption[] = [
    { label: APPLICABLE_SERVICE_ALL, value: APPLICABLE_SERVICE_ALL },
    { label: APPLICABLE_SERVICE_FUNDING, value: APPLICABLE_SERVICE_FUNDING },
    { label: APPLICABLE_SERVICE_CREDIT_CARD_STACKING, value: APPLICABLE_SERVICE_CREDIT_CARD_STACKING },
    { label: APPLICABLE_SERVICE_BUSINESS_CREDIT_BUILDER, value: APPLICABLE_SERVICE_BUSINESS_CREDIT_BUILDER },
];

export const PAYOUT_TYPE_COMMISSION = 'Commission';
export const PAYOUT_TYPE_FLAT_AMOUNT = 'Flat Amount';

export const PAYOUT_TYPE_OPTIONS: CompensationOption[] = [
    { label: PAYOUT_TYPE_COMMISSION, value: PAYOUT_TYPE_COMMISSION },
    { label: PAYOUT_TYPE_FLAT_AMOUNT, value: PAYOUT_TYPE_FLAT_AMOUNT },
];
