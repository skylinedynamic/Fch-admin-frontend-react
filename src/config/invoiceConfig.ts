export const STATUS_PAID = 'Paid';
export const STATUS_UNPAID = 'Unpaid';
export const STATUS_DISPUTED = 'Disputed';
export const STATUS_FAILED = 'Failed';
export const STATUS_PENDING = 'Pending';
export const STATUS_SUCCESS = 'Success';
export const STATUS_CANCELLED = 'Cancelled';
export const STATUS_OVERDUE = 'Overdue';
export const STATUS_ALL = 'All Status';

export const INVOICE_STATUS_OPTIONS = [
    { label: STATUS_ALL, value: null },
    { label: STATUS_PAID, value: STATUS_PAID },
    { label: STATUS_UNPAID, value: STATUS_UNPAID },
    { label: STATUS_PENDING, value: STATUS_PENDING },
    { label: STATUS_SUCCESS, value: STATUS_SUCCESS },
    { label: STATUS_FAILED, value: STATUS_FAILED },
    { label: STATUS_DISPUTED, value: STATUS_DISPUTED },
    { label: STATUS_OVERDUE, value: STATUS_OVERDUE },
    { label: STATUS_CANCELLED, value: STATUS_CANCELLED }
];

export const INVOICE_CYCLE_OPTIONS = [
    { label: 'All Cycle', value: null },
    { label: 'Monthly', value: 'Monthly' },
    { label: 'Annually', value: 'Annually' }
];

export const INVOICE_STATUS_COLORS: { [key: string]: string } = {
    [STATUS_PAID]: 'success',
    [STATUS_SUCCESS]: 'success',
    [STATUS_UNPAID]: 'danger',
    [STATUS_PENDING]: 'warning',
    [STATUS_OVERDUE]: 'danger',
    [STATUS_CANCELLED]: 'secondary',
    [STATUS_DISPUTED]: 'info',
    [STATUS_FAILED]: 'danger'
};
