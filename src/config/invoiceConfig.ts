export const STATUS_PAID = 'Paid';
export const STATUS_UNPAID = 'Unpaid';
export const STATUS_DISPUTED = 'Disputed';
export const STATUS_FAILED = 'Failed';
export const STATUS_PENDING = 'Pending';
export const STATUS_SUCCESS = 'Success';
export const STATUS_CANCELED = 'Canceled';
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
    { label: STATUS_CANCELED, value: STATUS_CANCELED }
];

export const INVOICE_CYCLE_OPTIONS = [
    { label: 'All Cycle', value: null },
    { label: 'Monthly', value: 'Monthly' },
    { label: 'Annually', value: 'Annually' }
];

export const INVOICE_STATUS_COLORS: { [key: string]: string } = {
    'paid': 'success',
    'success': 'success',
    'pending': 'warning',
    'overdue': 'danger',
    'canceled': 'secondary',
    'cancelled': 'secondary',
    'unpaid': 'warning',
    'disputed': 'info',
    'failed': 'danger'
};
