export type BillingItem = {
    id: number;
    entity_name: string;
    entity_id: number;
    upcoming_billing_date: string | null;
    upcoming_billing_amount: number | string | null;
    upcoming_billing_type: string | null;
    partner_name?: string | null;
    borrower_name?: string | null;
    enrollment_type?: string | null;
    status: string;
    subscription_start_date?: string | null;
    subscription_end_date?: string | null;
};

export type BillingDetails = {
    entity_type: string;
    entity_id: number;
    subscriber: any;
    subscription: any;
};

export type BillingFilterParams = {
    search?: string;
    page?: number;
    per_page?: number;
    sort_field?: string;
    sort_order?: 'asc' | 'desc' | string;
    filters?: Record<string, any>;
};
