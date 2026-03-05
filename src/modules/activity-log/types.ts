export interface ActivityLog {
    id: number;
    lead_id?: number | string;
    borrower_id?: number | string;
    partner_id?: number | string;
    user_id: number;
    summary: string;
    message_body?: string;
    reference: string;
    activity_date: string;
    created_at?: string;
    updated_at?: string;
    created_by_user?: {
        id: number;
        name: string;
    };
}

export interface ActivityParams {
    lead_id?: number | string;
    borrower_id?: number | string;
    partner_id?: number | string;
    limit?: number;
    page?: number;
    search?: string;
}
