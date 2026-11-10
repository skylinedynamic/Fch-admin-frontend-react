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

// Invoice types as the API stores them (fch-api Invoice::INVOICE_TYPES).
export const INVOICE_TYPE_ENROLLMENT = 'enrollment';
export const INVOICE_TYPE_DOWN_PAYMENT = 'down_payment';
export const INVOICE_TYPE_INSTALLMENT = 'installment';
export const INVOICE_TYPE_PLATFORM_FEE = 'platform_fee';
export const INVOICE_TYPE_BORROWER_FEE = 'borrower_fee';
export const INVOICE_TYPE_USER_SEAT = 'user_seat';
export const INVOICE_TYPE_COMMISSION_PAYOUT = 'commission_payout';

export const INVOICE_TYPE_OPTIONS = [
    { label: 'All Types', value: null },
    { label: 'Enrollment', value: INVOICE_TYPE_ENROLLMENT },
    { label: 'Down Payment', value: INVOICE_TYPE_DOWN_PAYMENT },
    { label: 'Installment', value: INVOICE_TYPE_INSTALLMENT },
    { label: 'Platform Fee', value: INVOICE_TYPE_PLATFORM_FEE },
    { label: 'Borrower Fee', value: INVOICE_TYPE_BORROWER_FEE },
    { label: 'User Seat', value: INVOICE_TYPE_USER_SEAT },
    { label: 'Commission Payout', value: INVOICE_TYPE_COMMISSION_PAYOUT },
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

/**
 * The partner's borrower fee is charged to the partner's card automatically
 * when the client makes their first enrollment payment; the partner can also
 * pay it from Invoices before then (BUG-059).
 */
export const PARTNER_FEE_PAYMENT_HINT =
  "You'll be charged automatically when the client pays their enrollment, or you can pay it manually from Invoices."

/** The same, with the amount, e.g. "$800.00 will be charged to you automatically when the client pays, …". */
export const partnerFeePaymentNote = (amount: string): string =>
  `${amount} will be charged to you automatically when the client pays, or you can pay it manually from Invoices.`
