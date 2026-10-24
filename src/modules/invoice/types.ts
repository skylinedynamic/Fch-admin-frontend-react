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
    status: 'Paid' | 'Pending' | 'Overdue' | 'Cancelled' | 'Unpaid' | 'Disputed' | 'Failed';
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
