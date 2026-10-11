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
    remind_me?: boolean;
    remind_at?: string;
    reminder_id?: number | null;
    reminder_status?: string | null;
    reminder_status_raw?: string | null;
    is_reminder_missed?: boolean;
    /** Created by a person (who chose its visibility), not written by the system. */
    is_manual?: boolean;
    can_edit?: boolean;
    can_delete?: boolean;
    visibility?: string;
    visibility_label?: string;
    can_edit_visibility?: boolean;
    is_edited?: boolean;
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
