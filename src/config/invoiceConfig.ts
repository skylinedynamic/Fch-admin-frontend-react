export const STATUS_PAID = 'Paid';
export const STATUS_UNPAID = 'Unpaid';
export const STATUS_DISPUTED = 'Disputed';
export const STATUS_FAILED = 'Failed';
export const STATUS_PENDING = 'Pending';
export const STATUS_SUCCESS = 'Success';
export const STATUS_CANCELED = 'Canceled';
// No longer set (fch-api stopped writing it on 2026-10-11) but older invoices
// still carry it, so the filter keeps it.
export const STATUS_EXPIRED = 'Expired';
export const STATUS_PROCESSING = 'Processing';
export const STATUS_ALL = 'All Status';

export const INVOICE_STATUS_OPTIONS = [
    { label: STATUS_ALL, value: null },
    { label: STATUS_PAID, value: STATUS_PAID },
    { label: STATUS_UNPAID, value: STATUS_UNPAID },
    { label: STATUS_PENDING, value: STATUS_PENDING },
    { label: STATUS_PROCESSING, value: STATUS_PROCESSING },
    { label: STATUS_SUCCESS, value: STATUS_SUCCESS },
    { label: STATUS_FAILED, value: STATUS_FAILED },
    { label: STATUS_DISPUTED, value: STATUS_DISPUTED },
    { label: STATUS_EXPIRED, value: STATUS_EXPIRED },
    { label: STATUS_CANCELED, value: STATUS_CANCELED }
];

export const INVOICE_CYCLE_OPTIONS = [
    { label: 'All Cycle', value: null },
    { label: 'Monthly', value: 'Monthly' },
    { label: 'Annually', value: 'Annually' }
];

export const INVOICE_HOST_OWNERSHIP_OPTIONS = [
    { label: 'All Invoice', value: null },
    { label: 'Partner Only', value: true },
    { label: 'Borrower Only', value: false }
];

export const INVOICE_OWNERSHIP_OPTIONS = [
    { label: 'All Invoice', value: null },
    { label: 'Mine Only', value: true },
    { label: 'Borrower Only', value: false }
];

export const INVOICE_STATUS_COLORS: { [key: string]: string } = {
    [STATUS_PAID]: 'success',
    [STATUS_SUCCESS]: 'success',
    [STATUS_UNPAID]: 'danger',
    [STATUS_PENDING]: 'warning',
    [STATUS_PROCESSING]: 'warning',
    [STATUS_EXPIRED]: 'secondary',
    [STATUS_CANCELED]: 'secondary',
    [STATUS_DISPUTED]: 'info',
    [STATUS_FAILED]: 'danger'
};
