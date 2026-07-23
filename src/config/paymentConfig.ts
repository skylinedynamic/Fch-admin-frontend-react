export const PAYMENT_STATUS_OPTIONS = [
    { label: 'All Status', value: null },
    { label: 'Succeeded', value: 'succeeded' },
    { label: 'Pending', value: 'pending' },
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
};
