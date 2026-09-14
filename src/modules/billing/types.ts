export type BillingItem = {
    id: number;
    entity_name: string;
    entity_id: number;
    upcoming_billing_date: string | null;
    upcoming_billing_amount: number | string | null;
    upcoming_billing_type: string | null;
    /** 'completed' means nothing further is owed — no upcoming_billing_date. */
    current_phase?: string | null;
    /** True while the subscriber is not Active — nothing will be charged. */
    is_billing_paused?: boolean;
    billing_paused_reason?: string | null;
    /** Already invoiced and still owed. */
    outstanding_amount?: number;
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
    upcoming_billing?: BillingItem | null;
};

export type BillingSummary = {
    /** Sum of what is scheduled to be charged across the filtered set. */
    scheduled_total: number;
    /** Everything already invoiced and still unpaid. */
    outstanding_total: number;
    /** Owed but not collectable — the subscriber is not Active. */
    paused_outstanding_total: number;
    paused_count: number;
    overdue_count: number;
    total_count: number;
};

export type BillingFilterParams = {
    search?: string;
    page?: number;
    per_page?: number;
    sort_field?: string;
    sort_order?: 'asc' | 'desc' | string;
    filters?: Record<string, any>;
    /** Narrow the list to rows needing a decision. */
    view?: 'all' | 'paused' | 'overdue' | 'scheduled';
    /** ENTITY_TYPE_PARTNER | ENTITY_TYPE_BORROWER from appConfig. */
    entity_type?: string;
};
