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
};

export type InvoiceStats = {
    total_invoices_sent: string | number;
    total_paid: string | number;
    total_unpaid: string | number;
    collection_rate: string | number;
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
