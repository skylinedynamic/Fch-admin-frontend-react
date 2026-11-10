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
