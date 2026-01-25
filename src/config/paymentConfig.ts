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
