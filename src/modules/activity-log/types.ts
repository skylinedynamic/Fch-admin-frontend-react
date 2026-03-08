export interface ActivityLog {
    id: number;
    log_name: 'activity' | 'email';
    lead_id?: number | string;
    borrower_id?: number | string;
    partner_id?: number | string;
    reference?: string;
    category?: string;
    activity_date?: string;
    subject: string;
    description: string;
    to_emails?: string[];
    attachments?: any[];
    status?: string;
    created_by: number;
    creator?: {
        id: number;
        name: string;
    };
    created_at: string;
    updated_at: string;
}

export interface ActivityParams {
    lead_id?: number | string;
    borrower_id?: number | string;
    partner_id?: number | string;
    limit?: number;
    page?: number;
    search?: string;
}
