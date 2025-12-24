export interface VerificationRequest {
    id: number;
    borrower_id: number;
    borrower_name: string;
    partner_id: number;
    partner_name: string;
    tier_id: number;
    tier_name: string;
    pending_count: number;
    request_date: string;
}

export interface VerificationResponse {
    status: boolean;
    message: string;
    data: VerificationRequest[];
    meta: {
        current_page: number;
        from: number;
        to: number;
        per_page: number;
        total: number;
        last_page: number;
    };
}
