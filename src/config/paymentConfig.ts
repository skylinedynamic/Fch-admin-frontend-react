export const PAYMENT_STATUS_OPTIONS = [
    { label: 'All Status', value: null },
    { label: 'Succeeded', value: 'succeeded' },
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'Failed', value: 'failed' },
    { label: 'Disputed', value: 'disputed' },
    { label: 'Refunded', value: 'refunded' }
];

export const PAYMENT_CYCLE_OPTIONS = [
    { label: 'All Cycle', value: null },
    { label: 'Daily', value: 'Daily' },
    { label: 'Weekly', value: 'Weekly' },
    { label: 'Monthly', value: 'Monthly' },
    { label: 'Yearly', value: 'Yearly' }
];

export const PAYMENT_STATUS_COLORS = {
    'succeeded': 'success',
    'pending': 'warning',
    'processing': 'warning',
    'failed': 'danger',
    'disputed': 'info',
    'refunded': 'secondary'
};

export const PAYMENT_ENVIRONMENT_OPTIONS = [
    { label: 'All Environment', value: null },
    { label: 'Production', value: 1 },
    { label: 'Sandbox', value: 0 }
];

export const PAYMENT_ENVIRONMENT_COLORS = {
    [1]: 'success', // Production
    [0]: 'info'     // Sandbox
};

export const PAYMENT_ENVIRONMENT_LABELS = {
    [1]: 'Production',
    [0]: 'Sandbox'
};

export const PAYMENT_METHOD_PROVIDER = {
    [1]: 'Stripe',
    [2]: 'Square',
    [3]: 'Ecrypt',
    [4]: 'Authorize.Net',
    [5]: 'Cash Payment',
    [6]: 'Bank Transfer',
};

export const PROVIDER_STRIPE = PAYMENT_METHOD_PROVIDER[1];
export const PROVIDER_SQUARE = PAYMENT_METHOD_PROVIDER[2];
export const PROVIDER_ECRYPT = PAYMENT_METHOD_PROVIDER[3];
export const PROVIDER_AUTHORIZE = PAYMENT_METHOD_PROVIDER[4];
export const PROVIDER_CASH = PAYMENT_METHOD_PROVIDER[5];
export const PROVIDER_BANK_TRANSFER = PAYMENT_METHOD_PROVIDER[6];

export const TRANSACTION_TYPE_DEBIT = 'Debit';
export const TRANSACTION_TYPE_CREDIT = 'Credit';

export const PAYMENT_METHOD_OPTIONS = [
    { label: 'All Methods', value: null },
    { label: PROVIDER_STRIPE, value: PROVIDER_STRIPE },
    { label: PROVIDER_BANK_TRANSFER, value: PROVIDER_BANK_TRANSFER },
    { label: PROVIDER_SQUARE, value: PROVIDER_SQUARE },
    { label: PROVIDER_ECRYPT, value: PROVIDER_ECRYPT },
    { label: PROVIDER_AUTHORIZE, value: PROVIDER_AUTHORIZE },
    { label: PROVIDER_CASH, value: PROVIDER_CASH },
];

export const PAYMENT_TYPE_OPTIONS = [
    { label: 'All Types', value: null },
    { label: TRANSACTION_TYPE_DEBIT, value: TRANSACTION_TYPE_DEBIT },
    { label: TRANSACTION_TYPE_CREDIT, value: TRANSACTION_TYPE_CREDIT },
];
