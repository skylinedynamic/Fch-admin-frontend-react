export const BILLING_OPTIONS = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Annual', value: 'annual' }
];

/**
 * Upcoming Billings row kinds (fch-api BillingResource::ROW_*). A borrower fee
 * row is the host's: a partner still owes the fee for the client it names.
 */
export const BILLING_ROW_SUBSCRIPTION = 'subscription';
export const BILLING_ROW_BORROWER_FEE = 'borrower_fee';

/**
 * The Upcoming Billings figure fch-api sends as `outstanding_amount` /
 * `outstanding_total`: the invoices raised and still unpaid. It is not what is
 * left on an installment plan - its later installments are not invoiced yet -
 * so it is called "Amount Due", not "Outstanding" (R3-BUG-019).
 */
export const BILLING_AMOUNT_DUE_LABEL = 'Amount Due';
export const BILLING_AMOUNT_DUE_HINT = 'Unpaid invoices raised so far. Installments not billed yet are not included.';
