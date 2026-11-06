/**
 * One side of an invoice - who issued it (billed_from) or who pays it
 * (billed_to). Same shape whatever kind of account is behind it.
 */
export type InvoiceParty = {
    name: string | null;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
};

export type Invoice = {
    id: number;
    invoice_id: string;
    partner_id: number;
    entity_type: string | null;
    entity_id: number | null;
    customer_name: string;
    email: string;
    country: string;
    payment_amount: string | number;
    payment_date: string;
    status: 'Paid' | 'Pending' | 'Canceled' | 'Expired' | 'Unpaid' | 'Disputed' | 'Failed' | 'Success' | 'Processing';
    cycle: string;
    created_at: string;
    // Only on the invoice detail response.
    billed_from?: InvoiceParty;
    billed_to?: InvoiceParty;
};

export type InvoiceStats = {
    invoices_sent: number;
    paid_invoices: number;
    unpaid_invoices: number;
    collection_rate: number;
};

export type InvoiceFilterParams = {
    search?: string;
    page?: number;
    per_page?: number;
    status?: string;
    payee?: string | number;
    cycle?: string;
    date_range?: [Date, Date] | null;
};

export type ProcessPaymentPayload = {
    payment_token: string;
    invoice_id: number | string;
    payment_method_id: number;
    bank_detail_id?: number | string;
};

/**
 * What the API answers for a payment attempt or its confirmation. A card whose
 * bank wants 3-D Secure comes back with `requires_action` and the
 * `client_secret` Stripe.js needs to run the bank's challenge (BUG-066); the
 * payment then stays `pending` until confirmAuthenticatedPayment settles it.
 */
export type ProcessPaymentResult = {
    success: boolean;
    payment_id?: number;
    transaction_id?: string;
    status: string;
    requires_action?: boolean;
    client_secret?: string;
    message?: string | null;
};

export type ProcessPaymentResponse = {
    status: boolean;
    message?: string;
    data?: ProcessPaymentResult;
};
