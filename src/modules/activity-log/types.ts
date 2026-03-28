export interface ActivityLog {
    id: number;
    log_type: string;
    lead_id?: number | string;
    borrower_id?: number | string;
    partner_id?: number | string;
    partner_image?: string;
    borrower_image?: string;
    lead_image?: string;
    reference?: string;
    category?: string;
    activity_date?: string;
    subject: string;
    description: string;
    to_emails?: string | string[];
    attachments?: any[];
    status?: string;
    causer?: {
        id: number;
        name: string;
    };
    causer_name?: string;
    causer_image?: string;
    event_label?: string;
    changes?: any;
    old_values?: any;
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
