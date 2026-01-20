export type Payment = {
    id: number;
    date: string;
    from: string;
    payment_type: string;
    company: string;
    details: string;
    transaction_id: string;
    amount: string | number;
    currency: string;
    status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'DISPUTED' | 'REFUNDED';
    created_at: string;
};

export type PaymentStats = {
    total_payments: number;
    completed: number;
    pending: number;
    failed: number;
};

export type PaymentFilterParams = {
    search?: string;
    page?: number;
    per_page?: number;
    status?: string;
    payee?: string | number;
    cycle?: string;
    date_from?: string;
    date_to?: string;
    date_range?: [Date, Date] | null;
};
