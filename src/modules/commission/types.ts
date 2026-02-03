export interface Commission {
    id: number;
    borrower: string; // Was borrower_name
    partner: string; // Was partner_name
    funding_application_id: number;
    total_commission: string;
    admin_commission: string;
    partner_commission: string;
    total_commission_amount: string;
    admin_commission_amount: string;
    partner_commission_amount: string;
    commission_status: 'Pending' | 'Approved' | 'Declined'; // Was status
    payment_status: 'Pending' | 'Paid' | 'Cancelled';
    currency: string;
    currency_symbol: string;
    conversion_rate: string;
    note: string | null;
    // Missing from response but likely needed or previously present
    date?: string; 
    funded_amount?: number; 
}

export interface CommissionFilters {
    search_text?: string;
    partner_id?: number | null;
    status?: string;
    payment_status?: string;
    date_range?: Date[] | null;
    page: number;
    per_page: number;
    sort_field?: string;
    sort_order?: string;
}
